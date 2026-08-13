import { normalizeMerchant } from '../utils/merchant'

export class MerchantNormalizationService {
  normalize(value: string | null | undefined): string {
    return normalizeMerchant(value)
  }
}
