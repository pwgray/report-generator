
import { GoogleGenAI, Type } from "@google/genai";
import { DataSource, ReportConfig, TableDef } from "../types";

const GEMINI_MODEL = "gemini-2.5-flash";

// API base URL (use Vite env VITE_API_URL, fallback to API_URL or process.env)
export const apiUrl = (() => {
  const env = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) || {};
  const raw = env?.VITE_API_URL || env?.API_URL || process.env?.API_URL || '';
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
})();

// Helper to get API key safely
// Prefer Vite runtime env var `import.meta.env.VITE_GEMINI_API_KEY` when running in the browser.
// Fall back to `process.env.API_KEY` which can be set in Node environments (tests/CI).
const getApiKey = () => {
  // Use import.meta.env when available (Vite client builds)
  // `import.meta` can be typed differently across environments, so use `any` here.
  const viteKey = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GEMINI_API_KEY : undefined) || '';
  const nodeKey = process.env.API_KEY || '';
  const key = viteKey || nodeKey;
  if (!key) {
    console.error("Gemini API key not found. Set VITE_GEMINI_API_KEY in .env.local for local dev or set API_KEY in the Node environment.");
  }
  return key;
};

export const generateReportData = async (
  dataSource: DataSource,
  reportConfig: ReportConfig,
  rowCount: number = 20
): Promise<any[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const ai = new GoogleGenAI({ apiKey });

  // Construct a prompt that describes the schema and the query
  const schemaDescription = dataSource.tables
    .filter(t => t.exposed)
    .map(t => {
      const cols = t.columns.map(c => `${c.name} (${c.type})`).join(", ");
      return `Table: ${t.name}\nColumns: ${cols}`;
    })
    .join("\n\n");

  const queryDescription = `
    Generate ${rowCount} rows of realistic mock data for a report.
    
    Data Source Schema:
    ${schemaDescription}

    Report Requirements:
    - Columns needed: ${reportConfig.selectedColumns.map(c => {
        const table = dataSource.tables.find(t => t.id === c.tableId);
        const col = table?.columns.find(col => col.id === c.columnId);
        return `${table?.name}.${col?.name}`;
    }).join(", ")}
    - Filters to apply (simulated): ${JSON.stringify(reportConfig.filters)}
    - Sorting: ${JSON.stringify(reportConfig.sorts)}
    
    Return ONLY a JSON array of objects. Keys should match the requested columns.
    Make the data consistent and realistic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: queryDescription,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temperature for consistency
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to generate report data", error);
    return [];
  }
};

export const generateSchemaFromDescription = async (description: string): Promise<any[]> => {
    return discoverSchema('custom', 'CustomDB', description);
};

export const discoverSchema = async (type: string, dbName: string, context: string = ''): Promise<TableDef[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
  
    const ai = new GoogleGenAI({ apiKey });
  
    // Heavily constrained prompt to avoid token overflow and repetition loops
    const prompt = `
      You are a database architect.
      Generate a schema for a '${type}' database named '${dbName}'.
      Context: ${context || 'General business database'}.

      Constraints:
      1. Generate EXACTLY 3 tables.
      2. Each table has MAX 5 columns.
      3. Descriptions must be concise (< 10 words).
      4. sampleValues must be short strings.
      5. Output valid JSON.
      
      For each table/column include: name, alias, description, sampleValue.
      Column types must be one of: "string", "number", "date", "boolean", "currency".
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            temperature: 0.1, // Low temperature to prevent hallucinations/loops
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        alias: { type: Type.STRING },
                        description: { type: Type.STRING },
                        columns: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ["string", "number", "date", "boolean", "currency"] },
                                    alias: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    sampleValue: { type: Type.STRING }
                                },
                                required: ["name", "type"]
                            }
                        }
                    },
                    required: ["name", "columns"]
                }
            }
        }
      });
  
      const text = response.text;
      if (!text) return [];
      
      const rawTables = JSON.parse(text);

      // Hydrate with IDs
      return rawTables.map((t: any) => ({
        id: crypto.randomUUID(),
        name: t.name,
        alias: t.alias || t.name,
        description: t.description || '',
        exposed: true,
        columns: t.columns.map((c: any) => ({
            id: crypto.randomUUID(),
            name: c.name,
            type: c.type,
            alias: c.alias || c.name,
            description: c.description || '',
            sampleValue: c.sampleValue || ''
        }))
      }));

    } catch (error) {
      console.error("Failed to generate schema", error);
      return [];
    }
};
