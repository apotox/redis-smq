import { config } from './config';
import { Consumer, Message } from '../..'; // from 'redis-smq'
import { TCallback } from '../../types'; // from 'redis-smq/types'

class Ns1TestQueueConsumer extends Consumer {
  consume(message: Message, cb: TCallback<void>) {
    //  console.log(`Got message to consume: `, JSON.stringify(message));
    //  throw new Error('TEST!');
    //  cb(new Error('TEST!'));
    //  const timeout = parseInt(Math.random() * 100);
    //  setTimeout(() => {
    //      cb();
    //  }, timeout);
    cb();
  }
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