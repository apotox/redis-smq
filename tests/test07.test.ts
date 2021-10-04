import { delay } from 'bluebird';
import { getConsumer, getProducer, untilConsumerIdle } from './common';
import { Message } from '../src/message';
import { events } from '../src/events';
import { ICallback } from '../types';

test('A consumer does re-queue and consume again a failed message when threshold not exceeded', async () => {
  const producer = getProducer();
  const consumer = getConsumer();

  let callCount = 0;
  const mock = jest.fn((msg: Message, cb: ICallback<void>) => {
    callCount += 1;
    if (callCount === 1) throw new Error('Explicit error');
    else if (callCount === 2) cb(null);
    else throw new Error('Unexpected call');
  });

  consumer.consume = mock;

  let queuedCount = 0;
  consumer.on(events.GC_MC_MESSAGE_REQUEUED, () => {
    queuedCount += 1;
  });

  let consumedCount = 0;
  consumer.on(events.MESSAGE_ACKNOWLEDGED, () => {
    consumedCount += 1;
  });

  const msg = new Message();
  msg.setBody({ hello: 'world' });

  await producer.produceMessageAsync(msg);
  consumer.run();

  await delay(10000);

  await untilConsumerIdle(consumer);
  expect(queuedCount).toBe(1);
  expect(consumedCount).toBe(1);
});
