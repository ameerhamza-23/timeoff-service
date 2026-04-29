import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HcmClientService } from './hcm-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  providers: [HcmClientService],
  exports: [HcmClientService],
})
export class HcmClientModule {}
