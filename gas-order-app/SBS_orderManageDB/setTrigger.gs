function setInstallableTriggers() {
  // 実行権限のあるメールアドレスリスト
  const start_cell = config_sheet.getRange('B17');
  const last_row = start_cell.getNextDataCell(SpreadsheetApp.Direction.DOWN).getRow();
  const allowed_emails = config_sheet.getRange(`B17:B${last_row}`).getValues().flat().filter(email => email);
  console.log(allowed_emails);

  // 実行者のメールアドレスを取得
  const email = Session.getActiveUser().getEmail();

  // 実行者のメールアドレスが上記リストに含まれていない場合
  if (!allowed_emails.includes(email)) {
    // 異常検知(=許可リストにない)
    SpreadsheetApp.getUi().alert("当該シート操作の実行が許可されていません。\n管理者メンバーから実行許可を受けてください。");
    return;
  }

  // 実行可能な権限者の場合、まずは既存の全トリガーを削除 
  // (目的：　トリガーの重複の回避、セキュリティや予期しない挙動リスクを軽減する)
  const all_trigers = ScriptApp.getProjectTriggers();
  all_trigers.forEach(tri => ScriptApp.deleteTrigger(tri));
  console.log("トリガーを初期化するため全て削除しました。");
  debug("トリガーを初期化完了!!");


  /** トリガーの設定: 
   * 「ScriptApp.newTrigger('トリガー実行したい関数名’)」 */
  
  // スプレッドシートが開かれたときのトリガー
  ScriptApp.newTrigger('setCustomMenu').forSpreadsheet(OM_SHEET_ID).onOpen().create();

  // スプレッドシートを編集した時のトリガー
  ScriptApp.newTrigger('onSetPartnerName').forSpreadsheet(OM_SHEET_ID).onEdit().create();

  // フォーム送信時のトリガー
  ScriptApp.newTrigger('onOrderFormSubmit').forForm(form).onFormSubmit().create();

  // 設定されたトリガー数の出力(確認のため)
  const new_all_triggers = ScriptApp.getProjectTriggers();
  console.log("セットされたトリガー数: ", new_all_triggers.length);
  debug("セットされたトリガー数: ", new_all_triggers.length);

}
