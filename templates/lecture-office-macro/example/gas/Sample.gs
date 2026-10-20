function calcAmounts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート1');
  const lastRow = sheet.getLastRow();
  for (let i = 2; i <= lastRow; i++) {
    const amount = sheet.getRange(i, 1).getValue() * sheet.getRange(i, 2).getValue();
    sheet.getRange(i, 3).setValue(amount);
  }
}
