import React, { PureComponent } from 'react';
import { shape, string, func } from 'prop-types';
import { Spin, Select, Cascader } from 'antd';
import ajax from '../../ajax';

export default class ShopSelect extends PureComponent {
  static propTypes = {
    value: shape({
      cityCode: string, // 城市代码
      shopId: string, // 门店ID
    }),
    onChange: func,
  }

  constructor(props) {
    super(props);
    this.state = {
      value: props.value || {}, // {cityCode,cityId}
      citys: null,
      provinceCity: [], // [provinceCode, cityCode]
      shops: [],
      loadingShops: false,
    };
  }

  componentDidMount() {
    const { onChange } = this.props;
    const { value } = this.state;
    ajax({
      url: `${window.APP.crmhomeUrl}/goods/itempromokb/getShops.json`,
      method: 'get',
      // data: { categoryId: '2016042200000078' },
      success: (res = {}) => {
        let { shopCountGroupByCityVO } = res;
        shopCountGroupByCityVO = shopCountGroupByCityVO || [];
        let provinceCity = null;
        let selectedCity = null;
        const provinces = {}; // 省市
        shopCountGroupByCityVO.forEach(city => {
          const { provinceCode, provinceName, cityCode, cityName, shops: cityShops } = city;
          const province = provinces[provinceCode];
          const cityInfo = { label: cityName, value: cityCode, shops: cityShops };
          if (province) {
            provinces[provinceCode].children.push(cityInfo);
          } else {
            provinces[provinceCode] = {
              label: provinceName,
              value: provinceCode,
              children: [cityInfo],
            };
          }
          if (value.cityCode && cityCode === value.cityCode) {
            provinceCity = [provinceCode, cityCode]; // 初始省市
            selectedCity = cityInfo;
          }
        });
        const citys = Object.keys(provinces).map(provinceCode => provinces[provinceCode]);

        if (provinceCity === null) {
          if (citys.length === 1) {
            const { value: provinceCode, children } = citys[0]; // 默认选中的省
            if (children.length === 1) {
              const cityInfo = children[0]; // 默认选中的城市
              const { value: cityCode } = cityInfo;
              provinceCity = [provinceCode, cityCode];
              selectedCity = cityInfo;
              value.cityCode = cityCode;
            }
          }
        }
        if (provinceCity) {
          const { shops } = selectedCity;
          if (shops.length === 0) {
            this.setState({
              citys,
              provinceCity,
              loadingShops: true,
            }, () => {
              this.getShops(provinceCity[1], selectedCity);
            });
            return;
          }
          let shop = shops.find(s => value.shopId && s.shopId === value.shopId);
          if (!shop && shops.length === 1) {
            shop = shops[0];
          }
          if (shop) {
            const { shopId } = shop;
            value.shopId = shopId;
          } else {
            value.shopId = '';
          }
          this.setState({ value, shops }, () => {
            if (onChange) {
              onChange(value);
            }
          });
        } else {
          value.shopId = '';
        }
        this.setState({
          citys,
          provinceCity,
          value,
        });
      },
    });
  }

  getShops(cityCode, selectedCity) {
    const { onChange } = this.props;
    const { value } = this.state;
    this.setState({ loadingShops: true });
    ajax({
      url: `${window.APP.crmhomeUrl}/promo/conponsVerify/getShopsByCityForNewCamp.json`,
      method: 'get',
      data: { cityCode },
      success: (res = {}) => {
        const { shopComps } = res;
        const shops = shopComps || [];
        Object.assign(selectedCity, { shops });
        let shop = shops.find(s => value.shopId && s.shopId === value.shopId);
        if (!shop && shops.length === 1) {
          shop = shops[0];
        }
        if (shop) {
          value.shopId = shop.shopId;
        } else {
          value.shopId = '';
        }
        this.setState({ value, shops, loadingShops: false }, () => {
          if (onChange) {
            onChange(value);
          }
        });
      },
    });
  }

  onCityChange = (provinceCity, citys) => {
    const { onChange } = this.props;
    const { value } = this.state;
    if (provinceCity.length === 0) {
      value.cityCode = '';
      value.shopId = '';
      this.setState({ provinceCity, value, shops: [] });
      if (onChange) {
        onChange(value);
      }
    } else {
      const cityInfo = citys[1];
      if (cityInfo && value.cityCode !== cityInfo.value) {
        const { value: cityCode, shops } = cityInfo;
        value.cityCode = cityCode;
        let shop = null;
        value.shopId = '';
        if (shops.length === 0) {
          this.setState({
            provinceCity,
            shops,
            value,
          }, () => {
            this.getShops(cityCode, cityInfo);
          });
          return;
        } else if (shops.length === 1) {
          shop = shops[0];
        }
        if (shop) {
          value.shopId = shop.shopId;
          if (onChange) {
            onChange(value);
          }
        }
        this.setState({
          provinceCity,
          value,
          shops,
        });
      }
    }
  }

  onShopChange = (shopId) => {
    const { onChange } = this.props;
    const { value: { cityCode } } = this.state;
    const value = { cityCode, shopId };
    this.setState({ value });
    if (onChange) {
      onChange(value);
    }
  }

  render() {
    const { citys, shops, provinceCity, value: { shopId }, loadingShops } = this.state;
    if (!citys) {
      return <Spin />;
    }
    return (
      <div className="c-shop-select">
        <Cascader style={{ width: 180, marginRight: 5, verticalAlign: 'bottom' }}
          allowClear
          size="large"
          placeholder="省/市"
          options={citys}
          value={provinceCity}
          onChange={this.onCityChange} />
        <Spin spinning={loadingShops} style={{ display: 'inline-block' }}>
          <Select style={{ width: 360, verticalAlign: 'bottom' }}
            allowClear showSearch optionFilterProp="children"
            size="large"
            placeholder="请选择门店"
            // disabled={loadingShops}
            value={loadingShops ? '' : shopId}
            onChange={this.onShopChange}>
            {shops.map((shop, i) => (
              <Select.Option value={shop.shopId} key={`${shop.shopId}-${i}`}>{shop.shopName}</Select.Option>
            ))}
          </Select>
        </Spin>
      </div>
    );
  }
}
