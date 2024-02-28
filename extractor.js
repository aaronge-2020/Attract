import * as z from "https://cdn.jsdelivr.net/npm/zod@3.22.2/+esm";
import * as zodJSON from "https://esm.sh/zod-to-json-schema@3.22.3";
import * as chatModels from "https://esm.sh/langchain/chat_models/openai";
import * as prompts from "https://esm.sh/langchain/prompts";
import * as langchainParser from "https://esm.sh/langchain/output_parsers";

const EXTRACTION_TEMPLATE =
  `Carefully read the provided HTML and identify all of the requested fields
   along with their associated properties. For each identified field, record 
   and save the details in a structured format using the Structure Information function. 
   Ensure to capture only those fields explicitly mentioned or implied within the passage. 
   If a property is relevant but not explicitly stated or required by the task parameters, 
   omit it from your output. Aim for completeness and accuracy in extracting and 
   documenting the relevant information.`;

function createZodSchema(fields, types, descriptions) {
  let schemaFields = {};

  fields.forEach((field, index) => {
    let type = types[index];
    let description = descriptions[index];

    switch (type) {
      case "string":
        schemaFields[field] = z.string().describe(description);
        break;
      case "number":
        schemaFields[field] = z.number().describe(description);
        break;
      case "boolean":
        schemaFields[field] = z.boolean().describe(description);
        break;
      // Additional type cases can be added here
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  });

  return z.object(schemaFields);
}
async function extractInformationFromHTML(
  cleanedHTML,
  fieldsToExtract,
  fieldsTypes,
  fieldsDescriptions
) {

  const parser = new langchainParser.JsonOutputToolsParser();

    
  const prompt = prompts.ChatPromptTemplate.fromMessages([
    ["system", EXTRACTION_TEMPLATE],
    ["human", "{input}"],
  ]);

  const model = new chatModels.ChatOpenAI({
    modelName: "gpt-3.5-turbo-1106",
    temperature: 0,
    openAIApiKey: localStorage.getItem("openaiKey"),
  }).bind({
    tools: [
      {
        type: "function",
        function: {
          name: "Structure Information",
          description: "Formats Information extracted from HTML",
          parameters: zodJSON.zodToJsonSchema(createZodSchema(fieldsToExtract, fieldsTypes, fieldsDescriptions)),
        },
      },
    ],
  });
  const chain = prompt.pipe(model).pipe(parser);

  debugger;
  const res = await chain.invoke({
    input: cleanedHTML,
  });
  

  return res;
}

export { extractInformationFromHTML };
