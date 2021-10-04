import { config } from './config';
import { Consumer, Message } from '../..'; // from 'redis-smq'
import { ICallback } from '../../types'; // from 'redis-smq/dist/types'

class Ns1TestQueueConsumer extends Consumer {
  consume(message: Message, cb: ICallback<void>) {
    //  console.log(`Got message to consume: `, JSON.stringify(message));
    //  throw new Error('TEST!');
    //  cb(new Error('TEST!'));
    //  const timeout = parseInt(Math.random() * 100);
    //  setTimeout(() => {
    //      cb();
    //  }, timeout);
    cb();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  expired(_message: any) {}
}

const consumer = new Ns1TestQueueConsumer('test_queue', config, {
  messageConsumeTimeout: 2000,
});
consumer.run();

/*
setTimeout(() => {
    console.log('stopping');
    consumer.shutdown();
}, 5000);

setTimeout(() => {
    console.log('starting');
    consumer.run();
}, 30000);
 */
