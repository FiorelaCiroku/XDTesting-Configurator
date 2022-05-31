import { Component } from '@angular/core';

@Component({
  selector: 'config-docs',
  template: `
    <h1>Documentation</h1>
    <p>
      Welcome on the help page of <b>XD Testing Configurator</b> tool.
      <br>
      To start, select one of the topics below:
    </p>

    <ul>
      <li>
        <a routerLink="./ontology">Ontology</a>
      </li>
      <li>
        <a routerLink="./fragment">Ontology Fragment</a>
      </li>
      <li>
        <a routerLink="./test">Test Case</a>
      </li>
    </ul>
  `,
  styles: ['']
})
export class DocsComponent{
}
