/**
 * 주택청약 가점 계산 (총 84점)
 * - 무주택 기간 최대 32점
 * - 부양가족 수 최대 35점
 * - 청약통장 가입기간 최대 17점
 */

export function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 만 30세 도달일 (해당 일자부터 만 30세) */
export function getAge30Date(birthDate) {
  return addYears(birthDate, 30);
}

/** 무주택 기간 산정 시작일 */
export function getHomelessStartDate(birthDate, marriageDate) {
  const age30 = getAge30Date(birthDate);
  if (marriageDate && marriageDate < age30) {
    return marriageDate;
  }
  return age30;
}

export function diffYears(start, end) {
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

export function diffMonths(start, end) {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

export function scoreHomelessFromYears(years) {
  if (years < 1) return 2;
  if (years < 2) return 4;
  if (years < 3) return 6;
  if (years < 4) return 8;
  if (years < 5) return 10;
  if (years < 6) return 12;
  if (years < 7) return 14;
  if (years < 8) return 16;
  if (years < 9) return 18;
  if (years < 10) return 20;
  if (years < 11) return 22;
  if (years < 12) return 24;
  if (years < 13) return 26;
  if (years < 14) return 28;
  if (years < 15) return 30;
  return 32;
}

export function scoreHomelessPeriod(birthDate, marriageDate, referenceDate = new Date()) {
  if (!birthDate) {
    return { points: 0, years: 0, startDate: null, label: "생년월일을 입력하세요" };
  }

  const start = getHomelessStartDate(birthDate, marriageDate);
  if (referenceDate < start) {
    return {
      points: 0,
      years: 0,
      startDate: start,
      label: "무주택 기간 산정 전 (만 30세 또는 결혼일 이전)",
    };
  }

  const years = diffYears(start, referenceDate);
  return {
    points: scoreHomelessFromYears(years),
    years,
    startDate: start,
    label: formatYearsLabel(years),
  };
}

export function countDependents({ spouse, children, parentsCohabiting }) {
  let count = 0;
  if (spouse) count += 1;
  count += Math.max(0, Math.min(10, children || 0));
  if (parentsCohabiting) count += 1;
  return count;
}

export function scoreDependents(count) {
  const table = [5, 10, 15, 20, 25, 30, 35];
  return table[Math.min(Math.max(0, count), 6)];
}

export function scoreSubscriptionFromMonths(months) {
  if (months <= 0) return 0;
  if (months < 6) return 1;
  if (months < 12) return 2;
  const years = months / 12;
  if (years < 2) return 3;
  if (years < 3) return 4;
  if (years < 4) return 5;
  if (years < 5) return 6;
  if (years < 6) return 7;
  if (years < 7) return 8;
  if (years < 8) return 9;
  if (years < 9) return 10;
  if (years < 10) return 11;
  if (years < 11) return 12;
  if (years < 12) return 13;
  if (years < 13) return 14;
  if (years < 14) return 15;
  if (years < 15) return 16;
  return 17;
}

export function scoreSubscriptionPeriod(joinDate, referenceDate = new Date()) {
  if (!joinDate) {
    return { points: 0, months: 0, label: "미가입" };
  }
  if (referenceDate < joinDate) {
    return { points: 0, months: 0, label: "가입일이 기준일 이후입니다" };
  }
  const months = diffMonths(joinDate, referenceDate);
  return {
    points: scoreSubscriptionFromMonths(months),
    months,
    label: formatMonthsLabel(months),
  };
}

export function getAnalysisTier(total) {
  if (total < 50) {
    return {
      tier: "low",
      title: "청약 가점 더 쌓기 필요",
      desc: "무주택 기간·부양가족·청약통장 납입을 늘리면 가점을 올릴 수 있어요.",
    };
  }
  if (total < 60) {
    return {
      tier: "mid-low",
      title: "수도권 외곽 청약 가능",
      desc: "경기·인천 외곽이나 지방 인기 단지에 도전해 볼 만한 가점입니다.",
    };
  }
  if (total < 70) {
    return {
      tier: "mid-high",
      title: "수도권 인기 지역 가능",
      desc: "수도권 일반 단지 청약에 경쟁력이 생기는 구간입니다.",
    };
  }
  return {
    tier: "high",
    title: "강남권 등 인기 단지 가능",
    desc: "고가점 구간으로, 인기 지역 특별공급·민영도 노려볼 수 있습니다.",
  };
}

export function calculateSubscriptionScore(input, referenceDate = new Date()) {
  const birthDate = parseDate(input.birthDate);
  const marriageDate =
    input.useMarriage && input.marriageDate ? parseDate(input.marriageDate) : null;
  const joinDate =
    input.hasSubscription && input.subscriptionJoinDate
      ? parseDate(input.subscriptionJoinDate)
      : null;

  const homeless = scoreHomelessPeriod(birthDate, marriageDate, referenceDate);
  const depCount = countDependents({
    spouse: !!input.spouse,
    children: Number(input.children) || 0,
    parentsCohabiting: !!input.parentsCohabiting,
  });
  const dependents = {
    count: depCount,
    points: scoreDependents(depCount),
  };
  const subscription = scoreSubscriptionPeriod(joinDate, referenceDate);
  const total = homeless.points + dependents.points + subscription.points;

  return {
    homeless,
    dependents,
    subscription,
    total,
    maxTotal: 84,
    analysis: getAnalysisTier(total),
  };
}

function formatYearsLabel(years) {
  if (years < 1) return "1년 미만";
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}

function formatMonthsLabel(months) {
  if (months < 12) return `${months}개월`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y}년`;
  return `${y}년 ${m}개월`;
}
