Option Explicit

Sub CalcAmounts()
    Dim lastRow As Long
    Dim i As Long

    lastRow = Cells(Rows.Count, 1).End(xlUp).Row
    For i = 2 To lastRow
        Cells(i, 3).Value = Cells(i, 1).Value * Cells(i, 2).Value
    Next i
End Sub
