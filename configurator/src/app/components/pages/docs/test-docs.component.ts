import { Component } from '@angular/core';

@Component({
  selector: 'config-test-docs',
  template: `
    <h1>Ontology Documentation</h1>
    <div class="d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center">
      <a routerLink="..">&lt; Back</a>
      <a routerLink="/docs">Main Docs Page</a>
    </div>
    <p>In this section you will find the necessary information to use the Test cases section of the XDTesting tool.</p>
    <h3>Main page</h3>
    <p>
      This view is presented to you when you click on the button to edit an ontology fragment from the Fragment section. In the main page it is present a table in which all the submitted test cases are listed. There's a button on the top-right side of the page with which it is possible to create a new test case. 
    </p>
    <h3>New Ontology Modal</h3>
    <p>
      If clicked, the button <button class="btn btn-primary"><i class="fa-solid fa-plus"></i>&nbsp;Create New Test</button>
      opens a new window which makes possible for you to provide input for a new test case. There are specific information that must be provided for different types of test cases. From the XDTesting tool, you can create three types of unit test cases, as described in the eXtreme Design methodology. The first one is Competency question verification test, the second is Inference verification test and the third is Error provocation test. 
    </p>
    <p>
     By default, the tool has selected the Competency question verification test as the type of the new test case. For this kind of test, you are required to provide the competency question that you want to test, shown under the Requirement text field; the SELECT SPARQL query; the expected results and the sample dataset. The last three can be uploaded from the local repository, be selected from a previously uploaded data list or inserted on-the-fly. To insert the SELECT SPARQL query on-the-fly, you can simply write in the text field. While, to insert the sample dataset and expected results, you can use the table at the end of the page. The prefix text field is used to add prefixes that are necessary for the sample dataset. If you click on the  <button class="btn btn-primary"><i class="fa-solid fa-plus"></i>&nbsp;Add Row</button>, a new row is created in the table. You can write the triples there and if the triple is an expected result you can select the option in the beginning of the row. If you want to delete a row, click on the red icon. 
    </p>
    To create another type of test case, you can use the selector named Test case type. If you select the Inference verification test, you will be required to provide a requirement that you are testing, an ASK SPARQL query and the corresponding sample dataset. You will also be asked to select a reasoner for the inference. The options for providing the SPARQL query and the sample dataset are the same as for the Competency question verification test. You will not be asked to select an expected result as by default it is <code>True</code>.
    <p>
     Lastly, from the Test case type selector you can choose to create a Error provocation test. In this case, you are required to upload only a sample dataset that contains errors. You will not be asked to select an expected result as by default it is an error.
    </p>
    
    <p>
     After you have saved the test case, you are notified that the input you provided is saved successfully and you are prompted with the complete information that is going to be used to construct a test case. After this moment, the tool with contruct the test case and execute it. You can view the results either on GitHub or in the app. 
    </p>
    
    <p>
      In the main view of the Test cases section there is also a second table where you can see a list of the previously uploaded data from existing test cases. In the table you have the information regarding the extension of the file and the type of the file. 
    </p>
    <p class="text-danger">
      <b>NOTE:</b> The ID of the test cases is created automatically. You can use it as a unique identifier.
    </p>
  `,
  styles: [
  ]
})
export class TestDocsComponent {
}
