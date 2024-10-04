export const format = (args: {
  input: string;
  params: { [key: string]: any };
}) => {
  const { input, params } = args;
  let output = input;
  for (const key in params) {
    const value = JSON.stringify(params[key]);
    output = output.replace(key, value);
  }
  return output;
};
