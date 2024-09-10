export const format = (args: {
  input: string;
  params: { [key: string]: string };
}) => {
  const { input, params } = args;
  let output = input;
  for (const key in params) {
    const value = params[key];
    output = output.replace(key, value);
  }
  return output;
};
