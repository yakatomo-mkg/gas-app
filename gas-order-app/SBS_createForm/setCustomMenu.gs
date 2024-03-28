/** 
 * 【onOpenトリガー設定中】
 * スプレッドシートのツールバーに 「teranova Menu」 を作成 
 */
function setCustomMenu() {
  SpreadsheetApp.getUi()
    .createMenu('てらのばメニュー')
    .addItem("注文フォームを作成", "updateOrderForm")
    .addSeparator()
    .addItem('orderシートからfreeeシートへ転記', 'copyOrderToFreeSheet')
    .addSeparator()
    // .addItem('チェック行データを削除', '')
    // .addSeparator()
    .addItem('［freee］ 認証', 'showAuth')
    .addItem('［freee］ 取引先リストを取得', 'fetchPartnersList')
    .addItem('［freee］ 納品書作成', 'createDeliverySlips')
    // .addItem('［freee］ ログアウト', 'logout')
    // .addItem('［freee］ 納品書取得', 'getchDeliverySlips')
    .addToUi();
}