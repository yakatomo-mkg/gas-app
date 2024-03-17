/**
 * orderシートの注文データのうち、チェックをつけたデータを、freeeシートに転記する関数
 */

// グローバル変数の定義
// const FREE_SHEET_ID = config_sheet.getRange('D6').getValue();     // freee用スプレッドシートオブジェクト
// const SHEET_NAME_FREEE = config_sheet.getRange('D7').getValue();  // 注文データ転記先シート
// const SHEET_NAME_PARTNERS = config_sheet.getRange('D8').getValue();  // プルダウンの参照先となる取引先管理シート

const USE_SHEET_NAME     = "freee";      // プルダウンを使う側のシート名
const SETTING_SHEET_NAME = "partners";   // プルダウンとそれに連動するリストを設定しているシート名
const PARTNERS_NAME_ROW = 6;  // 「freee取引先名」がセットされている列番号

function copyOrderToFreeSheet() {

  // freee用SSファイルの「freee」シートオブジェクトを取得
  // const freee_sheet = SpreadsheetApp.openById(FREE_SHEET_ID).getSheetByName(SHEET_NAME_FREEE);

  // orderシートのデータを一旦全て取得
  const values = order_sheet.getDataRange().getValues();
  const last_row = values.length;  // 行数(=最終行番号) ※indexではない!!
  const last_column = values[0].length;  // 列数（=ヘッダー行の列数を取得）

  let count_copied_data = 0;  // コピー完了した注文データのカウンター

  // メニュー列(`START_MENU_COLUMN`列以降)のヘッダー項目（1〜4行目の値）の値を事前にキャッシュしておく
  let menu_header = [];  // "要素追加"による変更が生じるため、letで宣言
  for (let j = order_sheet_config.START_MENU_COLUMN - 1; j < last_column; j++) {
    const item = values[0][j];  // 1行目の「品目名」を取得
    const amount = values[1][j];  // 2行目の「内容量」を取得
    const unit = values[2][j];  // 3行目の「単位(Unit)」を取得
    const price = values[3][j];  // 4行目の「単価」を取得

    menu_header.push({item, amount, unit, price});
  }

  // コピーが完了した行のインデックスを格納する配列
  let copied_row_indices = [];

  // orderシートの各行について処理
  for (let i = 4; i < last_row; i++) {  // 5行目からループをスタート
    if (values[i][0] === true) { // チェックボックスにチェックが入っている行のみ処理
    
      const order_row = values[i];  // 行データ(注文データ)を変数orderに格納
      console.log(`注文データID: ${order_row[2]}`);

      // 行データ転記前に最終行番号を取得しておく
      const last_row_number = freee_sheet.getLastRow();

      // 転記データ格納用 ("要素追加"による変更が生じるため、letで宣言)
      let copied_data = [""];  // 最初の要素にはチェックボックスを挿入するため、空白文字列で確保

      // 2〜5列目(indexが1〜4)の列データの処理
      for (let j = order_sheet_config.ACCEPTED_DATE_COLUMN - 1; j <= order_sheet_config.NAME_COLUMN - 1; j++) {
        copied_data.push(order_row[j]);  // そのままコピーして格納
      }

      // 空白文字列を挿入 (freee取引先, 取引先IDをセットするための列を確保)
      copied_data.push("", "");

      let menu_arr = [];  // メニュー項目のオブジェクトを１つにまとめるための配列 ("要素追加"による変更が生じるため、letで宣言)
      // 10列目以降の列データの処理
      for (let j = order_sheet_config.START_MENU_COLUMN - 1; j < last_column; j++) {
        // order_row[j]が0より大きい(1以上)かつ、整数であるときに処理を行う
        if (order_row[j] > 0 && Number.isInteger(order_row[j])) {
          const { item, amount, unit, price } = menu_header[j - (order_sheet_config.START_MENU_COLUMN - 1)];
          const quantity = order_row[j];  // order_row行の「注文数」を取得

          const item_data = {
            "item": item,
            "amount": amount,
            "unit": unit,
            "price": price,
            "quantity": quantity
          };
          menu_arr.push(item_data);
        }
      }
      console.log(menu_arr);
      console.log(JSON.stringify(menu_arr));
      copied_data.push(JSON.stringify(menu_arr));  // JSON文字列に変換してpush

      // freeeシートに行を追加して転記
      freee_sheet.appendRow(copied_data);
      freee_sheet.getRange(last_row_number + 1, 1).insertCheckboxes();  // 1列目にチェックボックスをセット

      count_copied_data++;  // コピー完了したらカウントアップ
      console.log(count_copied_data);

      // コピーされた行のインデックスを記録
      copied_row_indices.push(i);
    }
  }
  console.log(`コピー完了のデータ行 : ${copied_row_indices}`);

  // // コピーが完了した行をorderシートから削除
  // if (copied_row_indices.length > 0) {
  //   // point: インデックスが小さい順に削除すると、後続の行のインデックスが変わり、当初保存したインデックスの位置とズレる
  //   // したがって、もっとも下の行のデータ(大きいインデックスを持つ行データ）から削除していく
  //   copied_row_indices.reverce().forEach(idx => {
  //     order_sheet.deleteRow(idx + 1);  // 行番号は１から始まるため「+1」
  //   })
  // }

  if (count_copied_data > 0) {
    SpreadsheetApp.getUi().alert(`コピー完了した注文データ数 : ${count_copied_data}`); 
    // プルダウンリストを設定
    setPulldowns();

  } else {
    SpreadsheetApp.getUi().alert("チェックされた注文データがありません。\nコピーしたい注文データにチェックをつけてください。");
  }
}



/**
 * 行データがセットされたタイミングで、「freee（取引先名）」 列にプルダウンをセットする関数
 */
function setPulldowns() {

  // // freee用SSファイルの 「freee」シート および 「partners」シートオブジェクトを取得
  // const freee_sheet = SpreadsheetApp.openById(FREE_SHEET_ID).getSheetByName(SHEET_NAME_FREEE);
  // const partners_sheet = SpreadsheetApp.openById(FREE_SHEET_ID).getSheetByName(SHEET_NAME_PARTNERS);
  
  const name_list_range = partners_sheet.getRange("B4:B");
  // const id_list_range = partners_sheet.getRange("C4:C");

  const name_list_values = name_list_range.getValues().flat().filter(String);
  // const id_list_values = id_list_range.getValues().flat();
  console.log(name_list_values);

  // プルダウンの入力規制を定義 (第二引数のtrueは、無効な入力を許可しないの意)
  const pd_rule = SpreadsheetApp.newDataValidation().requireValueInList(name_list_values, true).build();
  // console.log(pd_rule);

  // freeeシートの最終行を取得し、列にプルダウンをセット
  const last_row = freee_sheet.getLastRow();
  console.log(last_row);
  const pd_range = freee_sheet.getRange(2, PARTNERS_NAME_ROW, last_row - 1);
  pd_range.setDataValidation(pd_rule);
}


/** openByIDでスプレッドシートを呼び出す際は、ベット */
function createTrigger() {
  ScriptApp.newTrigger('setCustomMenu')
  .forSpreadsheet(SHEET_ID)
  .onOpen()
  .create();
}


/**
 * freeeシートの「取引先名」プルダウンと「取引先ID」とを連動させるための処理
 * @brief: 選択された取引先名に対応する取引先IDを検索して、隣の列にセットする
 */ 
function onSelectedPartnerName(e) {
  if(!isTargetCol(e)) return;  // 編集された列が連動をトリガーさせる列（「取引先名」列）かどうかをチェック

  const selected_partner_value = e.value;  // 編集が行われた(プルダウンが選択された)セルの値
  const changed_row = e.range.getRow();  // 編集された行
  const use_sheet = e.source.getSheetByName(USE_SHEET_NAME);  // プルダウン連動を使う側のシート = freeeシート

  // プルダウンリストとそれに連動させるリストデータ(取引先名リストおよび取引先IDリスト)を取得
  const setting_sheet = e.source.getSheetByName(SETTING_SHEET_NAME);   // プルダウンリスト(取引先リスト)がセットされているシート
  const pd_list = setting_sheet.getRange(4, 2, setting_sheet.getLastRow(), 2);  // 取引先名リスト列 + 取引先IDリスト列

  console.log(pd_list);
  
  let linked_id = "";  // 名前に対応するIDを入れるための変数
  for (let i = 0; i < pd_list.length; i++) {
    if (pd_list[i][0] === selected_partner_value) {
      linked_id = pd_list[i][1];
      break;
    }
  }

  // 対応するIDを、プルダウン利用側のシート(freeeシート) の 「取引先ID」列 にセット
  const id_cell = use_sheet.getRange(changed_row, PARTNERS_NAME_ROW + 1);  // 「取引先名」列の隣の列
  id_cell.setValue(linked_id);
}


/**
 * 上記のonSelectedPartnerName関数において、プルダウン連動を発動させるかの判断を下す関数
 */
function isTargetCol(e) {
  // 対象の値が削除されたときは無視 (valueがundefinedになる)
  if (!e.range.getValue()) return false;  // 「取引先名」が削除されたとき

  // 対象シート以外のシートの変更のときは無視
  if (e.source.getSheetName !== USE_SHEET_NAME) return false;  // 利用側シート(freeeシート) に対する変更でないとき

  // 対象列以外の列の変更のときは無視
  if (e.range.getColumn() !== PARTNERS_NAME_ROW) return false;  // 「取引先名」列 に対する変更でないとき

  // 上記以外の場合は対象セルが変更されたと検知する
  return true;   // 利用側シート(freeeシート) の変更 && PARTNERS_NAME_ROW列の変更 && 値の削除でない
}
