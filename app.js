$(document).ready(function () {
  // Function to add a new field input along with a description input
  function addInputField(name = "", description = "") {
    const fieldHtml = $(`
            <div class="flex flex-wrap items-center mb-4 fieldItem">
                <input type="text" value ='${name}' placeholder="Field name (e.g., Author)" class="field-name shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2" style="flex-grow: 1;">
                <input type="text" value ='${description}' placeholder="Description (e.g., Article author)" class="field-description shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mr-2" style="flex-grow: 4;">
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
        addInputField(field.name, field.description);
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
          description: $(this).next(".field-description").val(),
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
  $("#article-form").submit(function (e) {
    e.preventDefault();
    const articleUrl = $("#article-url").val();
    const fieldsToExtract = $(".field-name")
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

    $.ajax({
      url: fetchUrl,
      type: "GET",
      dataType: "json",
      success: function (response) {
        const data = response.contents;
        if (data) {
          displayExtractedInformation(
            data,
            fieldsToExtract,
            fieldsDescriptions
          );
        } else {
          $("#result-container").html("<p>Could not retrieve the article.</p>");
        }
      },
      error: function () {
        alert("Failed to retrieve the article. Please try again.");
      },
      beforeSend: function () {
        $("#result-container").html("<p>Loading...</p>");
      },
    });
  });

  // Function to parse and display extracted information along with descriptions
  function displayExtractedInformation(htmlData, fields, descriptions) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlData, "text/html");
    let resultHtml = "";

    fields.forEach((field, index) => {
      // Generalized extraction based on user input
      const extractedContent = doc.querySelectorAll(field);
      const description = descriptions[index];
      if (extractedContent.length) {
        extractedContent.forEach((content) => {
          resultHtml += `<p><strong>${description}:</strong> ${content.innerHTML}</p>`;
        });
      } else {
        resultHtml += `<p><strong>${description}:</strong> Not found.</p>`;
      }
    });

    if (!resultHtml) {
      resultHtml = "<p>No information found for the specified fields.</p>";
    }

    $("#result-container").html(resultHtml);
  }
});
