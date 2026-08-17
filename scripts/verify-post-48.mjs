import fs from "fs";

const html = fs.readFileSync("blog/post-48.html", "utf8");
const m = html.match(/<article[\s\S]*?<\/article>/);
const text = m[0]
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, "");
console.log("공백제외글자수=", text.replace(/\s+/g, "").length);
const fb = html.match(/<footer[\s\S]*?<\/footer>/i)[0];
console.log("footer_privacy=", /privacy\.html/.test(fb));
console.log("footer_about=", /about\.html/.test(fb));
console.log("early_6=", /1년 일찍당 6%/.test(html) && /월 0\.5%/.test(html) && /30%/.test(html));
console.log("delay_72=", /7\.2%/.test(html) && /월 0\.6%/.test(html) && /36%/.test(html));
console.log("ages=", /만 61세/.test(html) && /만 62세/.test(html) && /만 63세/.test(html) && /만 64세/.test(html) && /만 65세/.test(html));
console.log("cpi_2_1=", /2\.1%/.test(html));
console.log("nps=", /내 연금 알아보기/.test(html));
