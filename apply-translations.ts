import * as fs from 'fs';
import { Project, SyntaxKind, StringLiteral, JsxText } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

// We manually map Arabic strings to their translation keys based on what's in LanguageContext.tsx
const dict = {
  'ساعة': 'cal.hour',
  'ساعات': 'cal.hours',
  'أضيف يدويا': 'cal.added_manually',
  'عمل في يوم راحة': 'cal.work_on_rest',
  'تم التسجيل بنجاح': 'cal.logged_successfully',
  'سجل الحضور': 'cal.attendance_log',
  'س عمل': 'cal.work_h',
  'س إضافي': 'cal.overtime_h',
  'راحة': 'cal.rest',
  'بديلة': 'cal.alternative',
  'مرضي': 'cal.sick',
  'سنوي': 'cal.annual',
  'أذونات': 'cal.permissions',
  'ساعات العمل': 'cal.working_hours',
  'إضافي الأسبوع': 'cal.weekly_overtime',
  'الهدف اليومي': 'cal.daily_target',
  'تحذير إضافي': 'cal.overtime_warning',
  'مقارنة بالأسبوع الماضي': 'cal.compared_to_last_week',
  'كفاءة الإنتاجية': 'cal.productivity_efficiency',
  'وقت التركيز العميق': 'cal.deep_focus_time',
  'يوم عمل': 'cal.work_day',
  'في إجازة': 'cal.on_leave',
  'إذن': 'cal.permission',
  'نصف يوم': 'cal.half_day',
  'نوع الإجازة': 'cal.leave_type',
  'اعتيادية': 'cal.casual',
  'عارضة': 'cal.unpaid',
  'إجازة بديلة': 'cal.alternative_leave',
  'نوع الإذن': 'cal.permission_type',
  'ساعتين': 'cal.two_hours',
  'نصف يوم عمل': 'cal.half_day_work',
  'العميل': 'cal.client',
  'المشروع': 'cal.project',
  'بدون عميل': 'cal.no_client',
  'مرتب': 'cal.salary',
  'تسجيل دخول': 'cal.login',
  'تسجيل خروج': 'cal.logout',
  'تسجيل': 'cal.log',
  'سجلات هذا اليوم': 'cal.records_today',
  'الإجمالي': 'cal.total',
  'إضافي': 'cal.overtime',
  'طوال اليوم': 'cal.all_day',
  'الإجازات الرسمية والأعياد': 'cal.holidays',
  'تتبع أوقات العمل في العطلات الرسمية': 'cal.track_holidays',
  'تم استيراد': 'cal.imported',
  'إجازات رسمية بنجاح': 'cal.holidays_successfully',
  'تم تسجيل جميع الإجازات مسبقاً': 'cal.all_holidays_logged',
  'استيراد عطلات مصر': 'cal.import_custom',
  'التاريخ': 'cal.date',
  'المناسبة': 'cal.occasion',
  'الحالة': 'cal.status',
  'إجراءات': 'cal.actions',
  'لا توجد إجازات مسجلة لهذا العام': 'cal.no_holidays',
  'تم العمل': 'cal.worked',
  'تحتسب بديلة': 'cal.counts_as_alternative',
  'إجازة عادية': 'cal.normal_leave',
  'قادمة': 'cal.upcoming',
  'اسم الإجازة': 'cal.holiday_name',
  'مثال': 'cal.example',
  'عطلة أجنبية، مناسبة شخصية': 'cal.holiday_example',
  'يرجى إدخال التاريخ والاسم': 'cal.enter_date_name',
  'إضافة عطلة مخصصة': 'cal.add_custom_holiday',
  'جدولة الورديات': 'cal.schedule_shifts',
  'التقويم المتقدم': 'cal.advanced_calendar',
  'الأسبوع': 'cal.week',
  'إعداد الورديات والوظائف': 'cal.setup_shifts_jobs',
  'ميلادي': 'cal.gregorian',
  'هجري': 'cal.hijri',
  'محول التاريخ': 'cal.date_converter',
  'شهري': 'cal.monthly',
  'أسبوعي': 'cal.weekly',
  'جدولة': 'cal.scheduling',
  'وظائف': 'cal.jobs',
  'اليوم': 'cal.today',
  'اختر وردية واضغط على الأيام لجدولتها': 'cal.select_shift_click_days',
  'يرجى إضافة ورديات من الإعدادات أولاً': 'cal.please_add_shifts',
  'تعديل السجل': 'cal.edit_log',
  'محول التاريخ الاحترافي': 'cal.pro_date_converter',
  'أدخل التاريخ الميلادي لمعرفة التاريخ الهجري المطابق له، بشكل فوري وسريع': 'cal.enter_greg_for_hijri',
  'التاريخ الميلادي': 'cal.gregorian_date',
  'التاريخ الهجري': 'cal.hijri_date',
  'إغلاق': 'cal.close',

  'العمل': 'rep.work',
  'وقت': 'rep.time',
  'أسبوع': 'rep.week',
  'السجل': 'rep.log',
  'تحليلات وتفاصيل الشهر الحالي': 'rep.current_month_analytics',
  'سجل الدوام': 'rep.attendance_log',
  'التحليلات': 'rep.analytics',
  'يوم': 'rep.day',
  'أساسي': 'rep.base',
  'مخطط ساعات العمل': 'rep.work_hours_chart',
  'يومي': 'rep.daily',
  'الدوام': 'rep.attendance',
  'تحميل تقرير': 'rep.download_report',
  'ابحث بملاحظة أو تاريخ': 'rep.search_note_date',
  'تصفية': 'rep.filter',
  'الكل': 'rep.all',
  'عمل اعتيادي': 'rep.regular_work',
  'إجازة': 'rep.leave',
  'إضافي وراحات': 'rep.overtime_and_rest',
  'يوم راحة': 'rep.rest_day',
  'الآن': 'rep.now',
  'وقت الدخول': 'rep.entry_time',
  'وقت الخروج': 'rep.exit_time',
  'تعليق': 'rep.comment',
  'ملاحظة': 'rep.note',
  'حفظ التعديلات': 'rep.save_changes',
  'تأكيد الحذف': 'rep.confirm_delete',
  'هل أنت متأكد من حذف هذا السجل بشكل نهائي؟': 'rep.sure_delete_log',
  'حذف نهائي': 'rep.final_delete',
  'إلغاء': 'rep.cancel',
  'لا توجد سجلات مطابقة': 'rep.no_matching_logs'
};

const replaceInFile = (filePath: string) => {
  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) return;

  let modified = false;

  const replaceNode = (node: any, isJsxText: boolean) => {
    const text = isJsxText ? node.getText().trim() : node.getLiteralText().trim();
    if (dict[text]) {
      const key = dict[text];
      if (isJsxText) {
        node.replaceWithText(node.getText().replace(text, `{t('${key}')}`));
      } else {
        const parent = node.getParent();
        if (parent.getKind() === SyntaxKind.JsxAttribute) {
          node.replaceWithText(`{t('${key}')}`);
        } else {
          node.replaceWithText(`t('${key}')`);
        }
      }
      modified = true;
    }
  };

  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxText) {
      replaceNode(node, true);
    } else if (node.getKind() === SyntaxKind.StringLiteral) {
      replaceNode(node, false);
    }
  });

  if (modified) {
    sourceFile.saveSync();
    console.log(`Modified ${filePath}`);
  }
};

replaceInFile('src/components/worklog/CalendarView.tsx');
replaceInFile('src/components/worklog/ReportsView.tsx');
replaceInFile('src/components/worklog/WeekView.tsx');
