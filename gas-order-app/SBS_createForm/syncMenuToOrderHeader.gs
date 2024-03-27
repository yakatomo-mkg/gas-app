/** 以下の処理はマクロ関数で実施することにしたためコメントアウト */

// /** menuシートに新しいメニューが追加されたときに、そのデータをorderシートに転記する関数 */

// function syncMenuToOrderHeader(mS) {
//   // itemNameCol列を下方向に検索して最終行を取得
//   const lastRowOfItemName = menuSheet.getRange(1, mS.itemNameCol).getNextDataCell(SpreadsheetApp.Direction.DOWN).getRow();

//   const itemId = menuSheet.getRange(lastRowOfItemName, mS.itemIdCol).getValue();
//   const itemName = menuSheet.getRange(lastRowOfItemName, mS.itemNameCol).getValue();
//   const itemUnit = menuSheet.getRange(lastRowOfItemName, mS.itemUnitCol).getValue();
//   const itemPrice = menuSheet.getRange(lastRowOfItemName, mS.itemPriceCol).getValue();

//   if (!itemId || !itemName || !itemUnit || !itemPrice) {
//     return;  // 必要データがセットされていなければ何もしない
//   }
//   const cellRange = menuSheet.getRange(lastRowOfItemName, mS.itemIdCol, 1, 5);  // 最終行のデータを取得
//   let newMenu = cellRange.getValues();  // 新しく追加されたメニューデータ
//   console.log(newMenu);
//   newMenu = transpose(newMenu);
//   console.log(newMenu);

//   const osLastCol = orderSheet.getLastColumn() + 1;  // orderシートの最終列
//   // 転記
//   orderSheet.getRange(1, osLastCol, newMenu.length, newMenu[0].length).setValues(newMenu);
//   // menuシートに、orderシートの列番号を設定
//   menuSheet.getRange(lastRowOfItemName, mS.orderCol).setValue(osLastCol);
// }


// /** 
//  * menuDBにメニューが追加・削除されたときに、syncMenuToOrderHeader関数を呼び出す 
//  * 
//  * TODO: トリガーを設定する
//  */
// function onUpdateMenuDb(e) {
//   const menuSheetName = "menu";  // menuシートの名前
//   const mS = MENU_SHEET_SETTINGS;
//   const targetSheet = e.source.getActiveSheet();
//   const targetRange = e.range;
//   // const targetValue = targetRange.getValue();

//   // 編集されたシートがmenuシートでない場合、処理を終了
//   if (targetSheet.getName() !== menuSheetName) return;
//   // 編集された範囲がitemNameCol, itemUnitCol、itemPriceColのいずれかでない場合、処理を終了
//   if (![mS.itemNameCol, mS.itemUnitCol, mS.itemPriceCol].includes(targetRange.getColumn())) return;
//   // // 値が削除されたときも無視
//   // if (!targetValue) return;
  
//   syncMenuToOrderHeader(mS);
// }






