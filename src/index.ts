import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { type } from 'arktype'
import { arktypeValidator } from '@hono/arktype-validator'

const app = new Hono()

const env = type({
  API_KEY: 'string',
}).assert(process.env)

const assignment = type({
  courseName: 'string',
  title: 'string',
  description: 'string',
  dueDate: 'string.date',
  alternateLink: 'string.url',
  id: 'string',
})
const assignmentArray = assignment.array()

const requireAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '')
  if (apiKey !== env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
});

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/data', requireAuth, arktypeValidator('json', assignmentArray), async (c) => {
  const json = await c.req.json()
  return c.json({ received: json })
})

export default app
