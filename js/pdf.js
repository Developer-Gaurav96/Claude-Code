/* ============================================================
   pdf.js — jsPDF itemised invoice
   Note: jsPDF's standard fonts are WinAnsi-encoded and contain no
   rupee glyph, so the PDF uses "Rs." while the UI uses the ₹ sign.
   ============================================================ */

(function () {
  var MDT = window.MDT;

  var INK = [30, 41, 59];
  var MUTED = [100, 116, 139];
  var FAINT = [148, 163, 184];
  var ACCENT = [2, 132, 199];
  var DAHI = [124, 58, 237];
  var LINE = [226, 232, 240];
  var SOFT = [241, 245, 249];

  function currentYM() {
    return typeof MDT.currentYM === 'function' ? MDT.currentYM() : MDT.monthKey(new Date());
  }

  function build(ym) {
    if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
      throw new Error('jsPDF failed to load. Check your internet connection and try again.');
    }
    var JsPDF = window.jspdf.jsPDF;
    var doc = new JsPDF({ unit: 'pt', format: 'a4' });

    var W = doc.internal.pageSize.getWidth();   // 595
    var H = doc.internal.pageSize.getHeight();  // 842
    var M = 44;                                 // margin
    var CW = W - (M * 2);                       // content width
    var y = 0;

    var s = MDT.settings();
    var t = MDT.monthTotals(ym);

    /* ---------- header ---------- */

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 104, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('MILK & DAHI TRACKER', M, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Consolidated dairy invoice', M, 64);

    doc.setFontSize(9);
    doc.setTextColor(148, 189, 226);
    doc.text('Generated ' + MDT.longDate(MDT.ymd(new Date())), M, 84);

    /* ---------- vendor / period cards ---------- */

    y = 136;

    function card(x, label, l1, l2) {
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.setFillColor(250, 251, 252);
      doc.roundedRect(x, y, (CW / 2) - 8, 74, 8, 8, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
      doc.text(label.toUpperCase(), x + 14, y + 20);

      doc.setFontSize(11.5);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(l1 || 'Not set', x + 14, y + 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(l2 || 'Not set', x + 14, y + 58);
    }

    card(M, 'Vendor', s.vendorName || 'Not set', 'Phone: ' + (s.vendorPhone || 'Not set'));
    card(M + (CW / 2) + 8, 'Billing period', MDT.monthLabel(ym), t.rows.length + ' day(s) logged');

    /* ---------- summary tiles ---------- */

    y = 228;

    function tile(x, w, label, value, rgb) {
      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.roundedRect(x, y, w, 66, 8, 8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text(label, x + 14, y + 22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(value, x + 14, y + 46);
    }

    var tw = (CW - 16) / 3;
    tile(M, tw, 'MILK PACKETS', String(t.milk), ACCENT);
    tile(M + tw + 8, tw, 'DAHI PACKETS', String(t.dahi), DAHI);
    tile(M + (tw * 2) + 16, tw, 'TOTAL AMOUNT', MDT.pdfRupees(t.amount), INK);

    /* ---------- table ---------- */

    y = 324;
    var COL = {
      date: M,
      desc: M + 74,
      qty: M + 292,
      rate: M + 352,
      amt: W - M
    };

    function header() {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(M, y, CW, 26, 5, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text('DATE', COL.date + 10, y + 17);
      doc.text('DESCRIPTION', COL.desc + 4, y + 17);
      doc.text('QTY', COL.qty, y + 17, { align: 'right' });
      doc.text('RATE', COL.rate, y + 17, { align: 'right' });
      doc.text('AMOUNT', COL.amt - 10, y + 17, { align: 'right' });
      y += 26;
    }

    function totalBlock() {
      var boxH = 92;
      var boxY = y + 12;
      var boxW = 236;

      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.roundedRect(W - M - boxW, boxY, boxW, boxH, 8, 8, 'F');

      var bx = W - M - boxW + 16;
      var ry = boxY + 24;

      function line(label, value, bold, rgb, isTotal) {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 12 : 9.5);
        doc.setTextColor(isTotal ? INK[0] : MUTED[0], isTotal ? INK[1] : MUTED[1], isTotal ? INK[2] : MUTED[2]);
        doc.text(label, bx, ry);
        doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        doc.text(value, W - M - 16, ry, { align: 'right' });
        ry += bold ? 26 : 20;
      }

      line('Milk subtotal (' + t.milk + ' packets)', MDT.pdfRupees(t.milkValue), false, ACCENT, false);
      line('Dahi subtotal (' + t.dahi + ' packets)', MDT.pdfRupees(t.dahiValue), false, DAHI, false);
      line('TOTAL PAYABLE', MDT.pdfRupees(t.amount), true, INK, true);

      return boxY + boxH;
    }

    if (!t.rows.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text('No entries recorded for this period.', M, y + 34);
      y += 50;
    } else {
      header();
      y += 10;

      t.rows.forEach(function (row, i) {
        if (y > H - 150) { doc.addPage(); y = 56; header(); y += 10; }

        var d = MDT.parseYmd(row.date);
        var bg = i % 2 === 0 ? [252, 253, 254] : [255, 255, 255];

        doc.setFillColor(bg[0], bg[1], bg[2]);
        doc.rect(M, y - 12, CW, 24, 'F');

        if (row.data.manual === false) {
          doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
          doc.setLineWidth(2);
          doc.line(M, y - 12, M, y + 12);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(String(d.getDate()).padStart(2, '0') + ' ' + MDT.MONTHS[d.getMonth()].slice(0, 3), COL.date + 10, y + 4);

        // Description: one line per item type on mixed days.
        var descLines = [];
        if (row.data.absent) {
          descLines.push('No delivery - marked absent');
        }
        if (row.data.milk > 0) {
          descLines.push('Milk ' + row.data.milk + ' packet(s) @ ' + MDT.pdfRupees(row.data.milkPrice));
        }
        if (row.data.dahi > 0) {
          descLines.push('Dahi ' + row.data.dahi + ' packet(s) @ ' + MDT.pdfRupees(row.data.dahiPrice));
        }

        doc.setFontSize(8.5);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(descLines, COL.desc + 4, y + (descLines.length > 1 ? 0 : 4));

        // Quantity is total packets; rate only applies on single-item days.
        var both = row.data.milk > 0 && row.data.dahi > 0;
        var qty = row.data.milk + row.data.dahi;
        var rateTxt;
        if (qty === 0) {
          rateTxt = '—';
        } else if (both) {
          rateTxt = 'Mixed';
        } else {
          rateTxt = row.data.milk > 0 ? MDT.pdfRupees(row.data.milkPrice) : MDT.pdfRupees(row.data.dahiPrice);
        }

        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(String(qty), COL.qty, y + 4, { align: 'right' });
        doc.setTextColor(both ? FAINT[0] : MUTED[0], both ? FAINT[1] : MUTED[1], both ? FAINT[2] : MUTED[2]);
        doc.text(rateTxt, COL.rate, y + 4, { align: 'right' });
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(MDT.pdfRupees(MDT.dayTotal(row.data)), W - M - 10, y + 4, { align: 'right' });

        y += 24;
      });

      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.setLineWidth(0.6);
      doc.line(M, y - 12, W - M, y - 12);

      y = totalBlock();
    }

    /* ---------- footer ---------- */

    var fy = Math.max(y + 26, H - 96);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.6);
    doc.line(M, fy, W - M, fy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(FAINT[0], FAINT[1], FAINT[2]);
    doc.text('Auto-generated by Milk & Dahi Tracker', M, fy + 18);
    doc.text('Amounts computed from daily packet counts and per-day unit rates.', M, fy + 31);

    doc.save('milk-dahi-invoice-' + ym + '.pdf');
  }

  MDT.exportPDF = function (ym) {
    try {
      build(ym || currentYM());
      MDT.toast('Invoice PDF saved');
      return true;
    } catch (err) {
      MDT.toast(err && err.message ? err.message : 'Could not generate the PDF.');
      return false;
    }
  };

  MDT.exportPDFFor = function (ym) { build(ym); };
})();
