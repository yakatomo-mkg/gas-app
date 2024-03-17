/** 
 * スプレッドシートのツールバーに 「teranova Menu」 を作成 
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('てらのばメニュー')
    .addItem('注文データをfreeeシートにコピー', 'copyOrderToFreeSheet')
    .addSeparator()
    .addItem('［freee］ 認証', 'showAuth')
    .addItem('［freee］ 取引先リストを取得', 'fetchPartnersList')
    .addItem('［freee］ 納品書作成', 'createDeliverySlips')
    // .addItem('［freee］ ログアウト', 'logout')
    // .addItem('［freee］ 納品書取得', 'getchDeliverySlips')
    .addToUi();
}
