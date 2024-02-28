import { extract } from "https://esm.sh/@extractus/article-extractor";
import { extractInformationFromHTML } from "./extractor.js";

function saveKey() {
  const openaiKey = document.getElementById("openai-key").value;
  if (openaiKey) {
    // Check if the input is not empty
    localStorage.setItem("openaiKey", openaiKey);
    alert("OpenAI Key saved successfully.");
  } else {
    alert("Please enter an OpenAI Key.");
  }
}

$(`#save-key`).click(saveKey);

$(document).ready(function () {
  // Load the OpenAI Key from local storage
  const savedKey = localStorage.getItem("openaiKey");

  if (savedKey) {
    // Set the input value to the saved key
    $(`#openai-key`).val(savedKey);
  }

  // Function to add a new field input along with a description input
  function addInputField(name = "", input_type = "", description = "") {
    const fieldHtml = $(`
            <div class="flex flex-wrap items-center mb-4 fieldItem">
                <input required type="text" value ='${name}' placeholder="Field name (e.g., Author)" class="field-name shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2" style="flex-grow: 1;">

                <select required class="field-type shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2" style="flex-grow: 1;">
                <option value="" ${
                  input_type === "" ? "selected" : ""
                }>Select Type</option>
                <option value="string" ${
                  input_type === "string" ? "selected" : ""
                }>String</option>
                    <option value="number" ${
                      input_type === "number" ? "selected" : ""
                    }>Number</option>
                    <option value="boolean" ${
                      input_type === "boolean" ? "selected" : ""
                    }>Boolean</option>
                </select>

                <input required type="text" value ='${description}' placeholder="Description (e.g., Article author)" class="field-description shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2" style="flex-grow: 4;">

                <button class="remove-field bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline">-</button>
            </div>
        `);
    $("#fields-container").append(fieldHtml);
    fieldHtml.find(".remove-field").click(function () {
      $(this).parent().remove();
    });
  }

  // Initially add one input field
  addInputField();

  // Add button event to add more input fields
  $("#add-field").click(function (e) {
    e.preventDefault();
    addInputField();
  });

  // Function to read and process the uploaded file
  $("#template-upload").change(function (e) {
    // Delete all divs with class fieldItem
    $(".fieldItem").remove();

    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      const fields = JSON.parse(e.target.result);
      fields.forEach((field) => {
        addInputField(field.name, field.input_type, field.description);
      });
    };
    fileReader.readAsText(e.target.files[0]);
  });

  // Function to export fields as a template
  $("#export-template").click(function () {
    const fields = $(".field-name")
      .map(function () {
        return {
          name: $(this).val(),
          input_type: $(this).next(".field-type").val(),
          description: $(this)
            .next(".field-type")
            .next(".field-description")
            .val(),
        };
      })
      .get();
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(fields));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "template.json");
    dlAnchorElem.click();
  });
  // Handle form submission
  $("#article-form").submit(async function (e) {
    e.preventDefault();
    $("#extracted-article").html("<p>Loading...</p>");

    $("#extraction-results").html("<p>Loading...</p>");

    const articleUrl = $("#article-url").val();
    const fieldsToExtract = $(".field-name")
      .map(function () {
        return $(this).val();
      })
      .get();

    const fieldsTypes = $(".field-type")
      .map(function () {
        return $(this).val();
      })
      .get();
    const fieldsDescriptions = $(".field-description")
      .map(function () {
        return $(this).val();
      })
      .get();

    if (!articleUrl) {
      alert("Please enter a URL.");
      return;
    }

    // AJAX request to fetch article content
    const fetchUrl =
      "https://api.allorigins.win/get?url=" + encodeURIComponent(articleUrl);

    try {
      const article = await extract(fetchUrl);

      const cleanedHTML = displayArticle(article.content);

      const extractedInformation = await extractInformationFromHTML(
        cleanedHTML,
        fieldsToExtract,
        fieldsTypes,
        fieldsDescriptions
      );

      displayResults(extractedInformation);
    } catch (err) {
      alert("Failed to retrieve the article. Please try again.");

      $("#result-container").html("<p>Could not retrieve the article.</p>");
      console.error(err);
    }
  });

  function cleanAndTransformHTML(htmlString) {
    // Remove all newline characters from the HTML string to simplify processing
    let preCleanedString = htmlString
      .replace(/\n+/g, "")
      .replace(/\s{2,}/g, " ");

    // Create a new DOM parser
    const parser = new DOMParser();
    // Parse the pre-cleaned string of HTML into a document object
    const doc = parser.parseFromString(preCleanedString, "text/html");

    // Function to recursively clean nodes in the DOM
    function cleanNode(node) {
      // Iterate over all child nodes of the current node
      let child = node.firstChild;
      while (child) {
        const nextChild = child.nextSibling;

        // Clean text nodes by trimming whitespace
        if (child.nodeType === 3) {
          // Text node
          child.nodeValue = child.nodeValue.replace(/\\n/g, "");
          if (child.nodeValue === "") {
            child.parentNode.removeChild(child);
          }
        }

        // Recursively clean element nodes
        else if (child.nodeType === 1) {
          // Element node
          cleanNode(child);
        }

        child = nextChild;
      }

      // More aggressive removal of empty elements including <p> tags filled with spaces or non-breaking spaces
      if (
        node.nodeType === 1 &&
        (node.childNodes.length === 0 || /^\s*$/.test(node.innerHTML))
      ) {
        node.parentNode.removeChild(node);
      }
    }

    // Start cleaning from the document's body
    cleanNode(doc.body);

    // Return the cleaned HTML content
    return doc.body.innerHTML;
  }
  // Function to parse and display extracted information along with descriptions
  function displayArticle(htmlData) {
    // Replace multiple line breaks and spaces with a single space
    const cleanedContent = cleanAndTransformHTML(htmlData);

    // Insert the cleaned content into the specified div
    document.getElementById("extracted-article").innerHTML = cleanedContent;

    return cleanedContent;
  }

  function displayResults(results) {
    // Get a reference to the container
    var container = document.getElementById("extraction-results");

    // Clear previous contents (if any)
    container.innerHTML = "";

    // Specify options for the JSONEditor
    var options = {
      mode: "tree", // set to 'code' to allow code editing, 'tree' for visual editor, or 'view' to just view
      modes: ["code", "form", "text", "tree", "view"], // can be adjusted according to what you want to allow
      onError: function (err) {
        alert(err.toString());
      },
      onModeChange: function (newMode, oldMode) {
        console.log("Mode switched from", oldMode, "to", newMode);
      },
    };

    // Create the editor
    var editor = new JSONEditor(container, options);

    // Set JSON data
    editor.set(results);

    window.editor = editor;
  }

  // If you want to get updated JSON data by the user, you can use editor.get()
  $("#save-json").click(function () {
    // If window.editor is not defined, then the editor has not been created
    if (!window.editor) {
      alert("Please extract information from an article first.");
      return;
    }

    // Retrieve JSON data from the editor
    var json = editor.get();

    // Serialize JSON data to a string
    var jsonString = JSON.stringify(json, null, 2); // Pretty print with 2 spaces indentation

    // Create a Blob object representing the JSON data
    var blob = new Blob([jsonString], { type: "application/json" });

    // Create a URL for the blob object
    var url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger the download
    var a = document.createElement("a");
    a.href = url;
    a.download = "extracted-data.json"; // File name for the download
    document.body.appendChild(a); // Append to the document
    a.click(); // Trigger the download
    document.body.removeChild(a); // Clean up
  });
});
