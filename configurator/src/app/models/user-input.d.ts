import { Fragment } from './fragments';
import { Ontology } from './ontology';

export interface UserInput {
  ontologies?: Ontology[];
  fragments?: Fragment[];
}
