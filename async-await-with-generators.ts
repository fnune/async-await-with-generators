import { strict as assert } from 'assert'

function asynq(func: () => Generator) {
  const iterable = func()

  function awwait(result: IteratorResult<unknown>): Promise<unknown> {
    if (result.done) {
      return Promise.resolve(result.value)
    }

    if (!(result.value instanceof Promise)) {
      // Nothing thenable here.
      return awwait(iterable.next(result.value))
    }

    return (
      result.value
        // Things worked out fine, we can call `awwait`.
        .then((value) => awwait(iterable.next(value)))
        // Oops. Calling `throw` will cause an exception,
        // so there's no need to continue the recursion.
        .catch((error) => iterable.throw(error))
    )
  }

  return awwait(iterable.next())
}

async function test() {
  const result = await asynq(function* () {
    const a = yield Promise.resolve('a')
    const b = yield Promise.resolve('b')
    const c = yield 'c'

    return [a, b, c]
  })

  assert.deepStrictEqual(result, ['a', 'b', 'c'])

  await asynq(function* () {
    try {
      yield Promise.resolve('a')
      yield Promise.reject('b')
    } catch (error) {
      assert.deepStrictEqual(error, 'b')
    }
  })
}

test()
