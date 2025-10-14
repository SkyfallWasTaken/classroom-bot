import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import { type } from 'arktype'
import { arktypeValidator } from '@hono/arktype-validator'
import { db, dataTable } from './db'
import JSXSlack, { Blocks, Divider, Header, Mrkdwn, Section } from 'jsx-slack'
import { WebClient } from '@slack/web-api'
import { formatDistance } from 'date-fns';

const app = new Hono()

const env = type({
  API_KEY: 'string',
  'DB_FILE_NAME?': 'string',
  SLACK_OWNER_ID: 'string',
  SLACK_CHANNEL_ID: 'string',
  SLACK_TOKEN: 'string',
}).assert(process.env)

const assignment = type({
  courseName: 'string',
  title: 'string',
  description: 'string',
  dueDate: 'string.date.parse',
  alternateLink: 'string.url',
  id: 'string',
})
const assignmentArray = assignment.array()
type Assignments = typeof assignmentArray;

const requireAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '')
  if (apiKey !== env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
});

const web = new WebClient(env.SLACK_TOKEN)

app.get('/', (c) => {
  return c.redirect('https://go.skyfall.dev/classroom')
})

app.post('/data', requireAuth, arktypeValidator('json', assignmentArray), async (c) => {
  const json = await c.req.json()
  await db.insert(dataTable).values({ timestamp: Date.now(), data: json }).run()
  return c.json({ received: json })
})

app.post("/send-notification", requireAuth, async (c) => {
  const [assignmentsRow] = await db.select().from(dataTable).orderBy(dataTable.timestamp).limit(1).all()
  if (!assignmentsRow) {
    return c.json({ error: 'No assignments found' }, 404)
  }
  const assignments = assignmentArray.assert(assignmentsRow.data).sort((a, b) => Number(a.dueDate) - Number(b.dueDate));
  const overdueAssignments = assignments.filter(a => new Date(a.dueDate) < new Date());
  const onTimeAssignments = assignments.filter(a => new Date(a.dueDate) >= new Date());

  const blocks = (
    <Blocks>
      <Section>
        :hyper-dino-wave: hi <a href={`@${env.SLACK_OWNER_ID}`} />!<br />here are the assignments you have due:
      </Section>
      {overdueAssignments.length > 0 && (
        <>
          <Header>:tw_warning: overdue assignments ({overdueAssignments.length})</Header>
          <Section>
            <ul>
              {overdueAssignments.map(assignment => (
                <li>
                  <b>{assignment.courseName}</b>: {assignment.title} - <b>due {formatDistance(new Date(assignment.dueDate), new Date(), { addSuffix: true })}</b>
                </li>
              ))}
            </ul>
          </Section>
          <Divider />
        </>
      )}
      {onTimeAssignments.length > 0 && (
        <>
          <Header>:spiral_calendar_pad: upcoming assignments ({onTimeAssignments.length})</Header>
          <Section>
            <ul>
              {onTimeAssignments.map(assignment => (
                <li>
                  <b>{assignment.courseName}</b>: {assignment.title} - due {formatDistance(new Date(assignment.dueDate), new Date(), { addSuffix: true })}
                </li>
              ))}
            </ul>

          </Section>
        </>
      )}
    </Blocks>
  )

  console.log(JSXSlack(blocks))
  web.chat
    .postMessage({
      channel: env.SLACK_CHANNEL_ID,
      blocks: JSXSlack(blocks),
    })
    .then((res) => console.log('Message sent: ', res.ts))
    .catch(console.error)

  return c.json({ assignments })
})

export default app
