import {Field, ZkProgram} from 'o1js';

export function Prover() {
  const prover = ZkProgram({
    name: 'Prover',
    publicInput: Field,
    methods: {
      baseCase: {
        privateInputs: [Field],
        method(publicInput: Field, factor: Field) {
          publicInput.mul(factor).assertEquals(256);
        },
      },
    },
  });

  return prover;
}

export async function runProver(publicInput: number, factor: number) {
  const prover = Prover();
  await prover.compile();
  let res = await prover.baseCase(Field(publicInput), Field(factor));
  console.log(res);
  res.verify();
  return res;
}
