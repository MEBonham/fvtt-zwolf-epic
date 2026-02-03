const evaluateFraction = (arr) => {
  return arr.filter((el) => el > 7).length / arr.length;
}
const offTarget = (arr, target) => {
  return Math.abs(evaluateFraction(arr) - target);
}

const TARGET = 5 / 12;
let series = [];

for (let i = 0; i < 108; i++) {
  const success = [ ...series, 12 ];
  const failure = [ ...series, 1 ];
  if (offTarget(success, TARGET) < offTarget(failure, TARGET)) {
    series = success;
  } else {
    series = failure;
  }
}