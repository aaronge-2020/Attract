import * as z from "https://cdn.jsdelivr.net/npm/zod@3.22.2/+esm";
import { zodToJsonSchema } from "https://esm.sh/zod-to-json-schema@3.22.3";
import { ChatOpenAI } from "https://esm.sh/langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "https://esm.sh/langchain/prompts";
import { JsonOutputFunctionsParser } from "https://esm.sh/langchain/output_parsers";

const EXTRACTION_TEMPLATE = `Carefully read the provided HTML and identify all of the requested fields
   along with their associated properties. For each identified field, record 
   and save the details in a structured format using the output_formatter function. 
   Ensure to capture only those fields explicitly mentioned or implied within the passage. 
   If a property is relevant but not explicitly stated or required by the task parameters, 
   write "NA" for the answer and the source. For the source of each answer, ensure that you are taking the verbatim
   quote in the article. Aim for completeness and accuracy in extracting and 
   documenting the relevant information.`;

function createZodSchema(fields, types, descriptions) {
  let schemaFields = {};

  fields.forEach((field, index) => {
    let type = types[index];
    let description = descriptions[index];
    
    switch (type) {
      case "string":

        schemaFields[`${field}_answer`] = z.string().describe(description);
        schemaFields[`${field}_source`] = z.string().describe(
            `The VERBATIM quote from the specified source that justifies the answer for "${field}"`
        );
        break;
      case "number":
        schemaFields[`${field}_answer`] = z.number().describe(description);
        schemaFields[`${field}_source`] = z.string().describe(
            `The VERBATIM quote from the specified source that justifies the answer for "${field}"`
        );
        break;
      case "boolean":
        schemaFields[`${field}_answer`] = z.boolean().describe(description);
        schemaFields[`${field}_source`] = z.string().describe(
            `The VERBATIM quote from the specified source that justifies the answer for "${field}"`
        );
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
  const zodSchema = createZodSchema(
    fieldsToExtract,
    fieldsTypes,
    fieldsDescriptions
  );

  const prompt = new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(EXTRACTION_TEMPLATE),
      HumanMessagePromptTemplate.fromTemplate("{inputHTML}"),
    ],
    inputVariables: ["inputHTML"],
  });

  const key = localStorage.getItem("openaiKey");
  const llm = new ChatOpenAI({
    modelName: "gpt-4-0125-preview",
    temperature: 0,
    openAIApiKey: key,
  });

  // Binding "function_call" below makes the model always call the specified function.
  // If you want to allow the model to call functions selectively, omit it.
  const functionCallingModel = llm.bind({
    functions: [
      {
        name: "output_formatter",
        description: "Should always be used to properly format output",
        parameters: zodToJsonSchema(zodSchema),
      },
    ],
    function_call: { name: "output_formatter" },
  });

  const outputParser = new JsonOutputFunctionsParser();

  const chain = prompt.pipe(functionCallingModel).pipe(outputParser);

  const response = await chain.invoke({
    inputHTML: cleanedHTML,
  });
  return response;
}

export { extractInformationFromHTML };
