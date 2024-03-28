/**
 * TODO: 【onEditトリガー設定中】
 * freeeシートの「取引先名」プルダウンと「取引先ID」とを連動させるための処理
 * 
 * @brief: 取引先名がセットされたらそれに対応する取引先IDを隣の列にセットする
 */ 
const targetSheet = "freee";  // プルダウンを使用するシート

function setLinkedPartnerId(e) {
  // 編集されたセルが「取引先名」列でない場合は処理を終了
  if(!isTargetCol(e)) return;
  
  // 編集されたセルが「取引先名」列であった場合
  const partnersIdMap = getPartnersIdMap();  // 取引先名と取引先IDのマッピングオブジェクトを取得 

  const selectedPartner = e.value;  // 編集されたセルの値（選択された取引先名）を取得
  const changedRow = e.range.getRow();  // 編集された行の行番号を取得
  const pulldownUseSheet = e.source.getSheetByName(targetSheet);  // プルダウン連動を使う側のシート

  console.log({
    "targetValue": selectedPartner,
    "targetRow": changedRow,
    "use_sheet": pulldownUseSheet.getName()
  });
  
  // 選択された取引先名に対応する取引先IDを取得 （マッピングが存在しない場合は空文字をセット）
  const linkedId = partnersIdMap[selectedPartner] || "";
  console.log("2. Linked ID: ", linkedId);  // 取得したIDのデバッグ出力

  // 取引先IDをセット
  pulldownUseSheet.getRange(changedRow, fS.partnerIdCol).setValue(linkedId);
}


/**
 * 上記のonSelectedPartnerName関数において、プルダウン連動を発動させるかの判断を下す関数
 */
function isTargetCol(e) {
  console.log(`e = ${e.range}`);
  // 対象の値が削除されたときは無視 (valueがundefinedになる)
  if (!e.range.getValue()) return false;  // 「取引先名」が削除されたとき

  // 対象シート以外のシートの変更のときは無視
  if (e.source.getSheetName() !== targetSheet) return false;  // 利用側シート(freeeシート) に対する変更でないとき

  // 対象列以外の列の変更のときは無視
  if (e.range.getColumn() !== fS.partnerNameCol) return false;  // 「取引先名」列 に対する変更でないとき

  // 上記以外の場合は対象セルが変更されたと検知する
  return true;   // "利用側シート(freeeシート)の変更 && 「取引先名」列の変更 && 値の削除でない" 場合はtrue
}



/** partnersシートから、「取引先名」と「取引先ID」の1対1関係を保持したオブジェクトを作成する関数 */
function getPartnersIdMap() {
  const pS = PARTNERS_SHEET_SETTINGS;
  const targetData = partnerSheet.getRange(pS.contStartRow, pS.nameCol, partnerSheet.getLastRow() - pS.contStartRow + 1, 2).getValues();
  const partnersIdMap = {};

  targetData.forEach(row => {
    partnersIdMap[row[0]] = row[1];
  });

  /** 
   * console.log(partnersIdMap);
   * 
   * { 'A社': 76875250,
   * 'B社': 76875251,
   * 'C社': 76875252,
   * 'D社': 76875284 }
   */

  return partnersIdMap;
}

