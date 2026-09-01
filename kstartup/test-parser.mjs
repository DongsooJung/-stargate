import assert from 'node:assert/strict';
import { __test } from '../api/kstartup.js';

const sample = {
  pbanc_sn: 123,
  biz_pbanc_nm: '테스트 &#40;공고&#41;',
  rcrt_prgs_yn: 'Y',
  supt_regin: '서울',
  supt_biz_clsfc: '사업화',
  pbanc_rcpt_bgng_dt: '20260101',
  pbanc_rcpt_end_dt: '20261231',
  detl_pg_url: 'https://example.com',
};
const row = __test.normalizeAnnouncement(sample, 2);
assert.equal(row.pbanc_sn, '123');
assert.equal(row.biz_pbanc_nm, '테스트 (공고)');
assert.equal(row.page_no, 2);
assert.equal(__test.PAGE_SIZE, 100);
const extracted = __test.extractItems({ currentCount: 1, totalCount: 10, data: [sample] });
assert.equal(extracted.items.length, 1);
assert.equal(extracted.totalCount, 10);
console.log('ok');
