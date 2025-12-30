import { round } from 'lodash'
import { singleton } from 'tsyringe'

/**định dạng dữ liệu */
export interface IFomat {
  /**
   * chuyển đổi số thành dạng đọc được
   * @param number số cần chuyển đổi
   * @param is_abbreviation có viết tắt không
   * * @example
   * - 1000 => 1k
   * - 1000000 => 1m
   * ...
   */
  numberToString: (number?: number, is_abbreviation?: boolean) => string
}
/**định dạng dữ liệu */
@singleton()
export class Format implements IFomat {
  numberToString(number?: number, is_abbreviation?: boolean) {
    /** nếu không có số thì trả về 0 */
    if (!number) return '0'

    /** nếu số nhỏ hơn 1000 thì trả về luôn */
    if (number < 1000 || !is_abbreviation) return number.toString()

    /**hậu tố đơn vị */
    const UNITS = ['', 'k', 'm', 'b', 't']
    /**lấy chỉ số của đơn vị */
    const UNIT_INDEX = Math.floor(Math.log10(number) / 3)
    /**giá trị của đơn vị */
    const UNIT_VALUE = number / Math.pow(1000, UNIT_INDEX)

    /** làm tròn giá trị + thêm hậu tố đơn vị */
    return round(UNIT_VALUE, UNIT_VALUE >= 100 ? 0 : 1) + UNITS[UNIT_INDEX]
  }
  /**
   * Hàm xóa dấu tiếng Việt
   * @param str chuỗi cần xóa dấu
   */
  removeAccents(str: string) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
  }
}
