export function getSalt(): string {
  return `${
    Math.random()
      .toString()
      .split('.')[1]
  }${
    Math.random()
      .toString()
      .split('.')[1]
  }`;
}
