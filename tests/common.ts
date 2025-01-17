import { promisifyAll } from 'bluebird';
import { events } from '../src/events';
import { RedisClient } from '../src/redis-client';
import { Producer, Consumer, Message, MonitorServer } from '../index';
import { config } from './config';
import { ICallback, IConsumerConstructorOptions } from '../types';

type TMonitorServer = ReturnType<typeof MonitorServer>;

const redisClients: RedisClient[] = [];
const consumersList: Consumer[] = [];
const producersList: Producer[] = [];
let monitorServer: TMonitorServer | null = null;

export async function startUp() {
  const redisClient = await getRedisInstance();
  await redisClient.flushallAsync();
}

export async function shutdown() {
  const p = async (list: (Consumer | Producer)[]) => {
    for (const i of list) {
      if (i.isRunning()) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          i.shutdown(resolve);
        });
      }
    }
  };
  await p(consumersList);
  await p(producersList);
  while (redisClients.length) {
    const redisClient = redisClients.pop();
    if (redisClient) {
      redisClient.end(true);
    }
  }
  await stopMonitorServer();
}

export function getConsumer({
  queueName = 'test_queue',
  options = {},
  consumeMock = null,
}: {
  queueName?: string;
  options?: IConsumerConstructorOptions;
  consumeMock?: ((msg: Message, cb: ICallback<void>) => void) | null;
} = {}): Consumer {
  const TemplateClass = class extends Consumer {
    // eslint-disable-next-line class-methods-use-this
    consume(message: Message, cb: ICallback<void>) {
      cb(null);
    }
  };
  const consumer = new TemplateClass(queueName, config, {
    messageRetryDelay: 0,
    ...options,
  });
  if (consumeMock) {
    consumer.consume = consumeMock;
  }
  const p = promisifyAll(consumer);
  consumersList.push(p);
  return p;
}

export function getProducer(queueName = 'test_queue') {
  const producer = new Producer(queueName, config);
  const p = promisifyAll(producer);
  producersList.push(p);
  return p;
}

export async function startMonitorServer() {
  await new Promise<void>((resolve) => {
    monitorServer = MonitorServer(config);
    monitorServer.listen(() => {
      resolve();
    });
  });
}

export async function stopMonitorServer() {
  return new Promise<void>((resolve) => {
    if (monitorServer) {
      monitorServer.quit(() => {
        monitorServer = null;
        resolve();
      });
    } else resolve();
  });
}

export function validateTime(
  actualTime: number,
  expectedTime: number,
  driftTolerance = 3000,
) {
  return (
    actualTime >= expectedTime - driftTolerance &&
    actualTime <= expectedTime + driftTolerance
  );
}

export async function getRedisInstance() {
  const c = promisifyAll(
    await new Promise<RedisClient>((resolve) =>
      RedisClient.getInstance(config, resolve),
    ),
  );
  redisClients.push(c);
  return c;
}

export async function consumerOnEvent(consumer: Consumer, event: string) {
  return new Promise<void>((resolve) => {
    consumer.once(event, () => {
      resolve();
    });
  });
}

export async function untilConsumerIdle(consumer: Consumer) {
  return consumerOnEvent(consumer, events.IDLE);
}

export async function untilConsumerUp(consumer: Consumer) {
  return consumerOnEvent(consumer, events.UP);
}

export async function untilMessageAcknowledged(consumer: Consumer) {
  return consumerOnEvent(consumer, events.MESSAGE_ACKNOWLEDGED);
}

export async function untilConsumerEvent(consumer: Consumer, event: string) {
  return consumerOnEvent(consumer, event);
}
