import fs from 'fs';
import path from 'path';

const root = path.resolve('blog');
const marker = 'data-official-sources="step5"';

const posts = {
  'post-57.html': [
    ['https://nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=239025', '국세청 — 월세액 세액공제'],
    ['https://www.hometax.go.kr/', '국세청 홈택스'],
  ],
  'post-56.html': [
    ['https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7682&mi=2251', '국세청 — 주택임대소득 과세대상 및 비과세, 과세미달'],
    ['https://www.hometax.go.kr/', '국세청 홈택스'],
  ],
  'post-55.html': [
    ['https://www.bokjiro.go.kr/', '복지로'],
    ['https://www.mohw.go.kr/menu.es?mid=a10714040000', '보건복지부 — 기초연금'],
  ],
  'post-53.html': [
    ['https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7707&mi=2308', '국세청 — 양도소득세 개요'],
    ['https://www.law.go.kr/법령/소득세법', '국가법령정보센터 — 소득세법'],
  ],
  'post-52.html': [
    ['https://nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7886&mi=6450', '국세청 — 연금소득'],
    ['https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0088M0.do', '국민연금공단 — 연금(일시금)과세제도 개요'],
  ],
  'post-51.html': [
    ['https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7880&mi=6600', '국세청 — 퇴직소득세 계산방법'],
    ['https://www.hometax.go.kr/', '국세청 홈택스'],
  ],
  'post-50.html': [
    ['https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7875', '국세청 — 연금계좌 세액공제'],
    ['https://www.hometax.go.kr/', '국세청 홈택스'],
  ],
  'post-47.html': [
    ['https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7728&mi=2338', '국세청 — 증여세 개요'],
    ['https://www.law.go.kr/법령/상속세및증여세법', '국가법령정보센터 — 상속세및증여세법'],
  ],
  'post-44.html': [
    ['https://www.applyhome.co.kr/ar/ara/selectSubscrptIntroBnkbView.do', '청약홈 — APT 청약안내 청약통장'],
  ],
  'post-43.html': [
    ['https://www.moef.go.kr/', '기획재정부'],
    ['https://www.nts.go.kr/', '국세청'],
  ],
  'post-41.html': [
    ['https://www.moef.go.kr/', '기획재정부'],
    ['https://www.korea.kr/briefing/pressReleaseView.do?newsId=156773219', '정책브리핑 — 2026년 세제개편안 발표'],
  ],
  'post-40.html': [
    ['https://www.molit.go.kr/', '국토교통부'],
    ['https://www.korea.kr/briefing/pressReleaseView.do?newsId=156770781', '정책브리핑 — 부동산정책, 국민의 목소리를 듣습니다'],
  ],
};

function block(links) {
  const items = links
    .map(
      ([href, title]) =>
        `              <li><a href="${href}" target="_blank" rel="noopener">${title}</a></li>`
    )
    .join('\n');
  return `          <div class="post-sources" ${marker}>
            <p class="post-sources-title">📎 참고 자료</p>
            <ul>
${items}
            </ul>
          </div>

`;
}

const report = [];

for (const [file, links] of Object.entries(posts)) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes(marker)) {
    report.push({ file, links: links.length, status: 'skip-already' });
    continue;
  }
  const needle = '          <div class="post-author-box" itemscope itemtype="https://schema.org/Person">';
  if (!html.includes(needle)) {
    report.push({ file, links: 0, status: 'missing-author-box' });
    continue;
  }
  html = html.replace(needle, block(links) + needle);
  fs.writeFileSync(fp, html);
  report.push({ file, links: links.length, status: 'ok' });
}

console.log(JSON.stringify(report, null, 2));
