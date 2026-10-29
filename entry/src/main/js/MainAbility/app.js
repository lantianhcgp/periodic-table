import catalog from './common/catalog';
export default {
  selectedElement: 0,
  tableLeft: 0,
  tableTop: 0,
  getElement: function (z) { return catalog.get(z); },
  onCreate: function () { console.info('PT:app_create'); },
  onDestroy: function () { console.info('PT:app_destroy'); }
};
