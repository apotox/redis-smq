import { IConfig, ICallback } from '../types';
import { Message } from './message';
import { ProducerStatsProvider } from './stats-provider/producer-stats-provider';
import { Instance } from './instance';
import { events } from './events';

export class Producer extends Instance {
  protected statsProvider: ProducerStatsProvider | null = null;

  constructor(queueName: string, config: IConfig = {}) {
    super(queueName, config);
    this.run();
  }

  getStatsProvider(): ProducerStatsProvider {
    if (!this.statsProvider) {
      this.statsProvider = new ProducerStatsProvider(this);
    }
    return this.statsProvider;
  }

  produceMessage(msg: unknown, cb: ICallback<void>): void {
    const message = !(msg instanceof Message)
      ? new Message().setBody(msg)
      : msg;
    const onProduced = () => {
      this.emit(events.MESSAGE_PRODUCED, message);
      cb();
    };
    const proceed = () => {
      this.getScheduler((err, scheduler) => {
        if (err) cb(err);
        else if (!scheduler) cb(new Error());
        else {
          if (scheduler.isSchedulable(message)) {
            scheduler.schedule(message, onProduced);
          } else {
            const { keyQueue } = this.getInstanceRedisKeys();
            this.getRedisInstance((client) => {
              client.lpush(
                keyQueue,
                message.toString(),
                (err?: Error | null) => {
                  if (err) cb(err);
                  else {
                    if (this.statsProvider)
                      this.statsProvider.incrementInputSlot();
                    cb();
                  }
                },
              );
            });
          }
        }
      });
    };
    if (!this.powerManager.isUp()) {
      if (this.isBootstrapping() || this.powerManager.isGoingUp())
        this.once(events.UP, proceed);
      else cb(new Error(`Producer ID ${this.getId()} is not running`));
    } else proceed();
  }
}
