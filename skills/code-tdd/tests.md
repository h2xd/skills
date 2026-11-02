# Good and bad tests

Examples for `h2xd:code-tdd`. A good test checks behavior through the public
interface. It reads like a line of the spec, and it survives a refactor of the
internals.

## Good

A test at the test entry point, through the real interface:

```typescript
test("user can check out with a valid cart", async () => {
  const cart = createCart()
  cart.add(product)
  const result = await checkout(cart, paymentMethod)
  expect(result.status).toBe("confirmed")
})
```

- It checks what a caller cares about.
- It uses the public interface only.
- Its name says what the code does, not how.
- It makes one logical assertion.

## Bad

### Coupled to the implementation

```typescript
// Bad: checks which internal function ran
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService)
  await checkout(cart, payment)
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total)
})
```

The sign: the test breaks when you refactor, though the behavior did not
change. Other signs are a mock of your own module, a test of a private
function, an assertion on call counts or call order, and a name that says how.

### Checked around the interface

```typescript
// Bad: reads the database instead of using the interface
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" })
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"])
  expect(row).toBeDefined()
})

// Good: the interface returns what was stored
test("createUser makes the user retrievable", async () => {
  const user = await createUser({ name: "Alice" })
  const retrieved = await getUser(user.id)
  expect(retrieved.name).toBe("Alice")
})
```

### Tautological

The expected value repeats the code's own computation, so the test passes by
construction and can never disagree with the code.

```typescript
// Bad: computes the expected value the way the code does
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }]
  const expected = items.reduce((sum, i) => sum + i.price, 0)
  expect(calculateTotal(items)).toBe(expected)
})

// Good: the expected value is a known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15)
})
```

## Mocks

Mock only at system boundaries:

- external APIs, such as payment or email
- time and randomness
- the database or the file system, when a test instance is impractical

Never mock your own modules or internal collaborators.

Pass a boundary dependency in, so a test can hand in a fake:

```typescript
// A test can pass a fake client
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total)
}

// A test cannot replace the client
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY)
  return client.charge(order.total)
}
```

Give each external operation its own function. Then each fake returns one
shape, and the test setup has no conditionals.

```typescript
// Each function is faked on its own
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch("/orders", { method: "POST", body: data }),
}

// A fake of this needs a branch per endpoint
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
}
```
