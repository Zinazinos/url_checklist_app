import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateJobDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsUrl(
    { require_protocol: true },
    { each: true, message: 'Each URL must include http:// or https://' },
  )
  urls!: string[];
}
