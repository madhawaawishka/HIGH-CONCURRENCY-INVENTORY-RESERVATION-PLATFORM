/**
 * The Catalog module's public API. Other modules may import only this file (enforced by
 * dependency-cruiser), never Catalog's domain, application or infrastructure internals.
 */
export { CATALOG_FACADE, type CatalogFacade } from './application/catalog-facade.js';
export { CatalogModule } from './catalog.module.js';
