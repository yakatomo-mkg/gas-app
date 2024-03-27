/**
 * メニューDBシートからのフォーム更新操作に基づいて、フォームのメニュー項目を更新する
 */
function updateOrderForm() {
  try {
    const formTitle = form.getTitle();
    const message = `\n${formTitle}\n\n上記のフォームを更新しても良いですか？`;
    // 確認ダイアログの表示
    if (!confirm(message)) return;  // 「いいえ」が選択された場合、処理を中断して関数から抜ける

    /** =======「はい」が選択された場合の処理 ======== */
    /** menuシートのエラーハンドリング */
    const mS = MENU_SHEET_SETTINGS;
    // 「商品名」列における最終行番号を取得 (=　getRange()で指定したセルから上方向に移動し、データが存在する最初のセルの行番号を返す)
    const lastRowOfItemName = menuSheet.getRange(menuSheet.getMaxRows(), mS.itemNameCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();

    // menuデータが0の時、すなわち lastRowOfItemName - mS.contStartRow + 1 が0の時はエラーダイアログを表示する
    if (lastRowOfItemName - mS.contStartRow + 1 === 0) {
        showDialog("Error", "メニューDBにおいて、メニューが見つかりません。");
        return;  // エラーが発生したため、処理を中断して関数から抜ける
    }
    
    // チェックボックス列において、少なくとも１つのチェックが入っていればtrueを返す
    const isCheckedData = menuSheet.getRange(mS.contStartRow, mS.ckBoxCol, lastRowOfItemName - mS.contStartRow + 1, 1).getValues().flat().some(Boolean);
    // チェックされたデータが存在しない場合、エラーダイアログを表示
    if (!isCheckedData) {
        showDialog("Error", "メニューシートにおいて、チェックされた項目が見つかりません。");
        return;  // エラーが発生したため、処理を中断して関数から抜ける
    }
    
    /** フォーム更新処理を開始 */
    // menuシートのコンテンツデータを取得(= ヘッダー2行分 & comment列 は除く)
    const values = menuSheet.getRange(mS.contStartRow, 1, lastRowOfItemName, mS.formTypeCol).getValues();  // formType列までを取得
    
    const items = form.getItems();
    // 既存の質問項目を出力して確認
    const existingQ = getItemTitles(items);
    console.log("既存の質問項目: ", existingQ.join(", "));

    // 既存の質問項目をすべて削除し、フォームを初期化
    items.forEach(item => form.deleteItem(item));

    // フォーム登録メニュー管理エリアを初期化
    clearMenuSheetValues(mS);

    // 基本情報に関する質問項目を追加
    addBasicQuestions(form);
    // 5. メニューアイテムをフォームに追加
    addMenuItems(values, lastRowOfItemName, mS);

    // 6. 質問タイトル「コメント」を設定
    form.addTextItem().setTitle("コメント");
    
    /** 下記のsyncMenuWithOrderHeader関数は、 マクロ関数での実装に変更 */
    // // メニューの全項目を、orderシートのヘッダーに同期
    // syncMenuWithOrderHeader(lastRowOfItemName, mS);

    // // orderシートにおける列番号を取得して、menuシートの管理エリアに出力
    // setOrderColToFmArea(lastRowOfItemName, mS);

    // 「注文ID」の質問のIDを取得してmenuシートのセルに出力
    getQuestionId(mS);

    // 更新後の公開用フォームURLを取得してmenuシートに出力
    getPublishedFormUrl(mS);

    // 成功メッセージを表示
    ss.toast("フォームの作成に成功しました。", "成功", 5);

  } catch (error) {
    // エラーメッセージを表示
    showDialog("Error", `フォーム更新中にエラーが発生しました。もう一度はじめからやり直してください。\n\nエラー詳細:\n${error.message}`);
  }
}


/** 基本情報に関する質問項目をフォームに追加する関数(「コメント」を除く) */
function addBasicQuestions(form) {
    // 1. 質問タイトル　「注文ID」　を設定
    form.addTextItem().setTitle("注文ID").setHelpText("注文管理のためのIDですので、削除や変更を行わないでください。").setRequired(true);
    // 2. 質問タイトル　「名前」　を設定
    form.addTextItem().setTitle("飲食店名（お名前）").setRequired(true);
    // 3. 質問タイトル　「メールアドレス」　を設定 (バリデーションを設定)
    form.addTextItem().setTitle("メールアドレス").setRequired(true).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
    // 4. 質問タイトル　「お届け日」　を設定 (現在の日付から30日分を設定する)
    form.addListItem().setTitle("お届け日").setRequired(true).setChoiceValues(generateDaysChoices(30)); 
}


/** メニューアイテムをフォームに追加する関数 */
function addMenuItems(values, lastRowOfItemName, mS) {
  try {
    for (let i = 0; i < lastRowOfItemName - 1; i++) {
      const isChecked = values[i][mS.ckBoxCol - 1];  // 「チェックボックス」列
      if (isChecked) {
        const itemId = values[i][mS.itemIdCol - 1];         // 商品ID
        const itemName = values[i][mS.itemNameCol - 1];     // 品名
        const itemUnit = values[i][mS.itemUnitCol - 1];     // 単位
        const itemAmount = values[i][mS.itemAmtCol - 1];    // 内容量
        const itemPrice = values[i][mS.itemPriceCol - 1];   // 単価
        const type = values[i][mS.formTypeCol - 1];   // フォームにおける形式(プルダウン or 記述式)
        let itemTitle = itemName;
        if (itemAmount) {
          itemTitle += "（" + itemAmount + "）";
        }
        // itemTitle += `   ¥${itemPrice} /${itemUnit}`;
        const itemDescription = `¥${itemPrice} /${itemUnit}`

        let qItem;
        switch (type) {
          case "記述式":
            if (!itemUnit) {
              throw new Error(`${itemName} の単位を入力してください。`); // エラーをthrowしたら、処理は中断される
            }
            qItem = form.addTextItem().setTitle(itemTitle).setHelpText(`${itemDescription}\n\n※「${itemUnit}」単位で、数値のみを入力してください。`);
            qItem.setValidation(FormApp.createTextValidation()
                .setHelpText("半角数値でご入力ください。")
                .requireNumber()
                .build());  // 整数値入力のバリデーションを設定
            break;        // switch-case文全体から抜ける
          case "プルダウン":
            // プルダウンの選択肢の範囲
            const orderUpperLimit = values[i][mS.upperLimitCol - 1];  // 注文数の上限値 (プルダウンのときのみ設定される)
            if (!orderUpperLimit || orderUpperLimit < 1) {
              throw new Error(`${itemName} の注文上限値を設定してください。`);
            }
            let choiceValues = [];
            for (let j = 1; j <= orderUpperLimit; j++) {
              choiceValues.push([j]);
            }
            qItem = form.addListItem().setTitle(itemTitle).setHelpText(itemDescription).setChoiceValues(choiceValues);
            break;  // switch-case文全体から抜ける
          default:
            throw new Error(`${itemName} の「フォーム形式」の列を設定してください`);
        }

        /** menuシートのフォームメニュー管理エリアに登録情報を書き込む */ 
        const oS = ORDER_SHEET_SETTINGS;
        const osColNumber = oS.menuStartCol + i;  // orderシートにおける列番号 (menu_dbにおいてi番目のメニューは、orderシートで 「oS.menuStartCol + i」 番目)
        writeToMenuSheet(qItem.getId(), itemId, itemName, itemUnit, mS, osColNumber);
      } 
    }
  } catch (error) {
    throw new Error(`メニューアイテムの追加中にエラーが発生しました。\n${error.message}`);
  }
  
}

/** menuシートの「フォームに登録されたメニューリスト」にメニュー情報を書き込む */
function writeToMenuSheet(qId, itemId, itemName, itemUnit, mS, colNum) {
  // フォーム管理エリアにおける最終行を取得
  const lastRowFmArea = menuSheet.getRange(menuSheet.getMaxRows(), mS.fmStartCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
  menuSheet.getRange(lastRowFmArea + 1, mS.fmStartCol, 1, 5).setValues([[qId, itemId, itemName, itemUnit, colNum]]);
}


/** 確認ダイアログを表示し、「はい」　ボタンが押された場合にのみ　true　を返す関数 */
function confirm(message) {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(message, ui.ButtonSet.YES_NO) === ui.Button.YES;
}


/** 質問項目のタイトルを取得する関数 */
function getItemTitles(items) {
  let itemTitles = [];
  for (let i = 0; i < items.length; i++) {
    const title = items[i].getTitle();
    itemTitles.push(title);
  }
  return itemTitles;
}


/** エラー発生時に、バインドされているフォームにエラーメッセージを表示する関数 */
function showDialog(title, message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(title, message, ui.ButtonSet.OK);
}


// /**
//  * 転置関数の定義
//  * 1. matrix[0].map((_, colIdx) => { ... }) : 最初の行を基準に各列をマッピング
//  * 2. matrix.map(row => row[colIdx])        : 各行のcolIdx列目の値を新しい行としてマッピング
//  */
// const transpose = matrix => matrix[0].map((_, colIdx) => matrix.map(row => row[colIdx]));  // 行と列を入れ替える

// /** menuシートのメニュー項目をorderシートのヘッダーに同期する関数 */
// function syncMenuWithOrderHeader(lastRowOfItemName, mS) {
//   // 「商品名」列における最終行番号を取得 (=　「商品名」列　に着目して、文字列がセットされているセルの数をカウント)
//   // const lastRowOfItemName = menuSheet.getRange(menuSheet.getMaxRows(), mS.itemNameCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
//   console.log(lastRowOfItemName);

//   const cellRange = menuSheet.getRange(mS.contStartRow, mS.itemIdCol, lastRowOfItemName - 1, 5);  // menuシートから商品ID、商品名、単位、内容量、単価の項目を取得
//   let arr = cellRange.getValues();  //  転記元の内容を二次元配列として格納
//   arr = transpose(arr);  // 転置行列に変換し、arrに再格納
//   console.log(arr);
//   console.log(arr.length, arr[0].length); // arr.length = 5,  arr[0].length = メニュー数

//   // 各メニューデータに対して、orderシートの列番号を取得して、menuシートに書き込む
//   const oS = ORDER_SHEET_SETTINGS;
//   for (let i = 0; i < arr[0].length; i++) {
//     const colIdx = oS.menuStartCol + i;  // orderシートの列番号を計算
//     menuSheet.getRange(i + mS.contStartRow, mS.orderCol).setValue(colIdx);
//   }
//   orderSheet.getRange(1, oS.menuStartCol, arr.length, arr[0].length).setValues(arr);
// }



// /** menuシートのフォームメニュー管理エリアにおいて、商品IDをもとにorderシートの列番号を取得してくる関数 */
// function setOrderColToFmArea(lastRowOfItemName, mS) {
//   // フォームメニュー管理エリアの最終行を取得
//   let lastRowFmArea = menuSheet.getRange(menuSheet.getMaxRows(), mS.fmStartCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
//   console.log(lastRowFmArea);
//   // 当該エリアの範囲を取得
//   const range = menuSheet.getRange(mS.contStartRow, mS.fmStartCol, lastRowFmArea - mS.contStartRow + 1, 5);  // 5列分
//   const values = range.getValues();
//   console.log(values);
//   /**  values:
//    * [ [ 1715639292, 'id001', '野菜セットS', '' ],
//    * [ 481307191, 'id003', '野菜セットL', '' ],
//    * [ 1589198409, 'id005', 'ジャガイモ', '' ],
//    * [ 989930047, 'id007', 'にんじん', '' ],
//    * [ 387438721, 'id008', 'にんじん', '' ] ]
//    */

//   // menuシートのitemId列を二次元配列として取得 (コンテンツ部分のみ(=ヘッダーを除く))
//   const itemIdRange = menuSheet.getRange(mS.contStartRow, mS.itemIdCol, lastRowOfItemName, 1).getValues();

//   for (let i = 0; i < values.length; i++) {
//     const itemId = values[i][1];
//     // menuシートのmenu_dbとフォームメニュー管理エリアの商品IDを照合
//     const rowIdx = itemIdRange.findIndex(row => row[0] === itemId) + mS.contStartRow;  // 行番号を取得
//     console.log(rowIdx);
    
//     if (rowIdx < 2) { 
//       throw new Error(`照合先のmenuデータベースにおいて、商品ID「${itemId}」の商品が見つかりませんでした。\nmenuデータベースを確認してください。`);
//     }
//     // 照合先のmenu_dbにおけるorderCol列の値を取得
//     const orderColValue = menuSheet.getRange(rowIdx, mS.orderCol).getValue();
//     menuSheet.getRange(mS.contStartRow + i, mS.fmStartCol + 4).setValue(orderColValue);  // fmStartCol列の3列右にズレた列に値をセット
//   }
// }


/** menuシートの、フォームメニュー管理エリアを初期化する関数 */
function clearMenuSheetValues(mS) {
  let lastRowFmArea = menuSheet.getRange(menuSheet.getMaxRows(), mS.fmStartCol).getNextDataCell(SpreadsheetApp.Direction.UP).getRow();
  const numRows = lastRowFmArea - mS.contStartRow + 1;  // 3行目から最終行までの行数を計算
  if (numRows > 0) {
    menuSheet.getRange(mS.contStartRow, mS.fmStartCol, numRows, 5).clearContent(); // 5列分を消去
  }
}


/** 更新後のフォームにおける、「注文ID」の質問IDを取得する関数 */
function getQuestionId(mS) {
  try {
    const firstQuestion = form.getItems()[0];
    if (firstQuestion && firstQuestion.getTitle() === "注文ID") {
      const questionId = firstQuestion.getId();
      menuSheet.getRange(mS.questionIdCell).setValue(questionId);
    } else {
      throw new Error("質問タイトル「注文ID」がフォームの質問に存在しません。もう一度はじめからやり直してみてください。");
    }
  } catch (error) {
    throw new Error(`「注文ID」の質問IDの取得時にエラーが発生しました。${error.massage}`);
  }
}

function getPublishedFormUrl(mS) {
  try {
    const formUrl = form.getPublishedUrl();
    menuSheet.getRange(mS.formPublishedUrlCell).setValue(formUrl);
  } catch (error) {
    throw new Error(`更新後のフォームURLの取得に失敗しました。${error.massage}`);
  }
}
