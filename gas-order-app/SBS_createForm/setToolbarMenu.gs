function setToolbarMenu() {
  let ui = SpreadsheetApp.getUi();
  ui.createMenu("teranova Menu").addItem("注文フォームを更新", "updateOrderForm").addToUi();
}
