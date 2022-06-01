import { Component } from '@angular/core';

@Component({
  selector: 'config-ontology-docs',
  template: `
    <h1>Ontology Documentation</h1>
    <div class="d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center">
      <a routerLink="..">&lt; Back</a>
      <a routerLink="/docs">Main Docs Page</a>
    </div>
    <p>In this section you will find the necessary information to use the ontology section of the XDTesting tool.</p>

    <h3>Main page</h3>
    <p>
      In the main page it is present a table in which all the registered ontologies are listed. There's a button on the
      top-right side of the page with which it is possible to register or upload a new ontology. 
    </p>

    <h3>New Ontology Modal</h3>
    <p>
      If clicked, the button <button class="btn btn-primary"><i class="fa-solid fa-plus"></i>&nbsp;Add Ontology</button>
      shows a modal in which it is possible to upload a new ontology or register one already present in the repository.
    </p>

    <p>
      By default, the modal shows an input in which it is possible to insert the URL to the raw ontology file; the URL
      must be the GitHub URL, with the form specified as an example in the input field, from which it is possible to access
      the file.
    </p>

    <p>By clicking the switch button at the top of the modal:</p>
    <div class="d-flex align-items-center mb-2">
      <p-inputSwitch></p-inputSwitch>
      <span class="ms-2">Upload new ontology</span>
    </div>
    <p>
      it is possible to upload a new ontology file from your local machine. This file will be stored in the chosen GitHub repository under the folder <code>.xd-testing/OntologyName</code> where <code>OntologyName</code> is the name you give to your ontology.
    </p>

    <p class="text-danger">
      <b>NOTE:</b> The ontology name must be unique, i.e.: you can't have two ontologies with the same name.
    </p>
  `,
  styles: [
  ]
})
export class OntologyDocsComponent {
}
