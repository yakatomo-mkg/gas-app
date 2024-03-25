/** 現在(関数が実行された時点)の日付からn日後までの日付を要素に持つ配列を返す関数 */
function generateDaysChoices(n) {
  const now = new Date();  // 現在(この関数実行時)の日付を取得
  const choices = [];  // 選択肢の配列を初期化
  const day_of_week = ['日', '月', '火', '水', '木', '金', '土'];

  // 30日分の選択肢を生成
  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const formatted_date = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy年M月d日（' + day_of_week[date.getDay()] + '）');
    choices.push(formatted_date);
  }

  return choices;  // 生成された配列を返す
}

/** 
 * 【トリガーを設定する!!】
 * 日付トリガーで毎日呼び出されて、「お届け日」　のプルダウン選択肢を更新する関数
 */
function updateDaysChoices() {
  const item = form.getItems(FormApp.ItemType.LIST)[0];  // ItemTyepがLISTである質問項目の最初の要素(=「お届け日」)を取得
  console.log(item.getTitle());

  if (item && item.getTitle() === 'お届け日') {
    item.asListItem().setChoiceValues(generateDaysChoices(30));  // 30日分の選択肢を更新
  } else {
    console.log("「お届け日」の日付更新に失敗しました。");
    debug("Error: 日付ベーストリガー「お届け日の日付更新」に失敗...");
  }
}
