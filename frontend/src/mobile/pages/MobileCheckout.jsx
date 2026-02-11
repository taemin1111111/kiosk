import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppActiveCart, postAppCheckout } from '../../api';

import backSvg from '../../assets/arrow_back_ios_new.svg';
import chevronDownSvg from '../../assets/keyboard_arrow_down.svg';
import tableBarSvg from '../../assets/table_bar.svg';
import takeoutSvg from '../../assets/takeout_dining.svg';
import storePointSvg from '../../assets/store_point.svg';
import tossPng from '../../assets/toss.png';
import creditCardSvg from '../../assets/credit_card.svg';
import qrCodeScannerSvg from '../../assets/qr_code_scanner.svg';
import moneyBagSvg from '../../assets/money_bag.svg';
import walletSvg from '../../assets/wallet.svg';

export default function MobileCheckout() {
  const [scale, setScale] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [pointBalances, setPointBalances] = useState({ store: 0, toss: 0 });
  const [loading, setLoading] = useState(true);
  const [diningType, setDiningType] = useState('in'); // 'in' | 'takeout'
  const [diningOpen, setDiningOpen] = useState(true);
  const [tossOpen, setTossOpen] = useState(false);
  const [tossWasOpened, setTossWasOpened] = useState(false); // 한 번이라도 펼쳤으면 푸터 상세 유지
  const [pointType, setPointType] = useState(''); // '' | 'store' | 'toss'
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'simple' | 'cash' | 'transfer'
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  const navigate = useNavigate();

  const paymentMethodLabel = {
    card: '카드 결제',
    simple: '간편결제',
    cash: '현금결제',
    transfer: '계좌이체',
  };

  const totalPrice = summary.total || 0;
  const storePoint = pointBalances.store;
  const tossPoint = pointBalances.toss;
  const pointAccumulationRate = 10;
  const pointAccumulation = Math.floor((totalPrice * pointAccumulationRate) / 100);
  // 포인트는 주문 금액 초과 사용 불가 → 최대 totalPrice까지만 사용
  const storePointUsed = pointType === 'store' ? Math.min(storePoint, totalPrice) : 0;
  const tossPointUsed = pointType === 'toss' ? Math.min(tossPoint, totalPrice) : 0;
  const discountAmount = storePointUsed + tossPointUsed;
  const finalAmount = totalPrice - discountAmount;

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getAppActiveCart().catch(() => ({ ok: false }));
      if (cancelled) return;
      if (res?.ok) {
        setSummary(res.data?.summary || { count: 0, total: 0 });
        setCartItems(Array.isArray(res.data?.items) ? res.data.items : []);
        setPointBalances({
          store: Number(res.data?.store_point_balance) || 0,
          toss: Number(res.data?.toss_point_balance) || 0,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePay = async () => {
    if (paySubmitting || finalAmount < 0 || cartItems.length === 0) return;
    setPayError('');
    setPaySubmitting(true);
    try {
      const res = await postAppCheckout({
        method: paymentMethod,
        store_point_used: storePointUsed,
        toss_point_used: tossPointUsed,
        eat_type: diningType,
      });
      if (res?.ok) {
        navigate('/menu/order-complete', { state: res.data });
        return;
      }
      setPayError(res?.message || '결제에 실패했습니다.');
    } catch (e) {
      setPayError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const formatOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) return null;
    return options
      .map((o) => `${o.item_name_ko || ''} ${o.option_qty > 1 ? `×${o.option_qty}` : ''}`.trim())
      .filter(Boolean)
      .join(' | ');
  };

  return (
    <div className="figma360-stage figma360-stage--checkout" data-node-id="836-120580">
      <div className="figma360-scale figma360-scale--checkout" style={{ '--figma360-scale': String(scale) }}>
        <div className="checkout">
          <header className="checkout__header">
            <div className="checkout__topBar">
              <button
                type="button"
                className="checkout__back"
                aria-label="뒤로"
                onClick={() => navigate('/menu/cart')}
              >
                <img className="checkout__backIcon" src={backSvg} alt="" />
              </button>
            </div>
            <div className="checkout__titleBar">
              <h1 className="checkout__title">결제하기</h1>
            </div>
          </header>

          <div className="checkout__body">
            <section className="checkout__section checkout__section--order">
              <h2 className="checkout__sectionTitle">주문 내역</h2>
              <div className="checkout__orderList">
                {loading ? (
                  <p className="checkout__loading">로딩 중...</p>
                ) : cartItems.length === 0 ? (
                  <p className="checkout__empty">주문 내역이 없습니다.</p>
                ) : (
                  cartItems.map((it, index) => (
                    <div key={it.id}>
                      {index > 0 && <div className="checkout__line" />}
                      <div className="checkout__orderItem">
                        <div
                          className="checkout__orderImg"
                          style={it.image_url ? { backgroundImage: `url(${it.image_url})` } : undefined}
                          aria-hidden
                        />
                        <div className="checkout__orderInfo">
                          <p className="checkout__orderNameKo">{it.menu_name_ko}</p>
                          {it.menu_name_en && <p className="checkout__orderNameEn">{it.menu_name_en}</p>}
                          {formatOptions(it.options) ? (
                            <div className="checkout__orderOptions">
                              {(() => {
                                const segs = formatOptions(it.options).split(' | ');
                                const lines = [];
                                for (let i = 0; i < segs.length; i += 3) lines.push(segs.slice(i, i + 3));
                                return lines.map((lineSegs, lineIdx) => (
                                  <div key={lineIdx} className="checkout__orderOptionsLine">
                                    {lineSegs.map((seg, i) => (
                                      <span key={i}>
                                        {i > 0 && <span className="checkout__optionDivider"> | </span>}
                                        {seg}
                                      </span>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </div>
                          ) : null}
                        </div>
                        <p className="checkout__orderPrice">
                          {(Number(it.total_price) || 0).toLocaleString('ko-KR')}원
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <div className="checkout__line" />

            <section className="checkout__section checkout__section--dining">
              <button
                type="button"
                className="checkout__diningHeader"
                onClick={() => setDiningOpen(!diningOpen)}
                aria-expanded={diningOpen}
              >
                <span className="checkout__diningTitle">식사 방법</span>
                <span className="checkout__diningHeaderRight">
                  {diningType === 'in' ? '매장에서 먹어요' : '포장해가요'}
                </span>
                <img
                  className={`checkout__chevronIcon ${diningOpen ? 'checkout__chevronIcon--up' : ''}`}
                  src={chevronDownSvg}
                  alt=""
                  aria-hidden
                />
              </button>
              {diningOpen && (
                <div className="checkout__diningBody">
                  <div className="checkout__diningGrid">
                    <button
                      type="button"
                      className={`checkout__diningCard ${diningType === 'in' ? 'checkout__diningCard--active' : ''}`}
                      onClick={() => setDiningType('in')}
                    >
                      <img className="checkout__diningCardIcon" src={tableBarSvg} alt="" aria-hidden />
                      <span className="checkout__diningCardLabel">매장에서 먹어요</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout__diningCard ${diningType === 'takeout' ? 'checkout__diningCard--active' : ''}`}
                      onClick={() => setDiningType('takeout')}
                    >
                      <img className="checkout__diningCardIcon" src={takeoutSvg} alt="" aria-hidden />
                      <span className="checkout__diningCardLabel">포장해가요</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="checkout__line" />

            <section className="checkout__section checkout__section--toss">
              <button
                type="button"
                className="checkout__tossHeader"
                onClick={() => {
                  const next = !tossOpen;
                  setTossOpen(next);
                  if (next) setTossWasOpened(true);
                }}
                aria-expanded={tossOpen}
              >
                <span className="checkout__tossHeaderTitle">토스 포인트</span>
                <span className="checkout__tossHeaderRight">
                  {pointType === 'store' && `${storePointUsed.toLocaleString('ko-KR')}P 사용`}
                  {pointType === 'toss' && `${tossPointUsed.toLocaleString('ko-KR')}P 사용`}
                  {!pointType && <span className="checkout__tossHeaderPlaceholder">사용 안 함</span>}
                </span>
                <img
                  className={`checkout__chevronIcon ${tossOpen ? 'checkout__chevronIcon--up' : ''}`}
                  src={chevronDownSvg}
                  alt=""
                  aria-hidden
                />
              </button>
              {tossOpen && (
                <div className="checkout__tossBody">
                  <p className="checkout__tossInstruction">쓸 금액을 선택하세요</p>
                  <div className="checkout__tossOptions">
                    <label className={`checkout__tossOption ${pointType === 'store' ? 'checkout__tossOption--selected' : ''}`}>
                      <input
                        type="radio"
                        name="pointType"
                        checked={pointType === 'store'}
                        onChange={() => setPointType('store')}
                        className="checkout__tossRadio"
                      />
                      <img src={storePointSvg} alt="" className="checkout__tossOptionIcon" aria-hidden />
                      <span className="checkout__tossOptionText">
                        <span className="checkout__tossOptionLabel">매장 포인트</span>
                        <span className="checkout__tossOptionAmount">{storePoint.toLocaleString('ko-KR')} P</span>
                      </span>
                      <span className="checkout__tossRadioMark" aria-hidden />
                    </label>
                    <label className={`checkout__tossOption ${pointType === 'toss' ? 'checkout__tossOption--selected' : ''}`}>
                      <input
                        type="radio"
                        name="pointType"
                        checked={pointType === 'toss'}
                        onChange={() => setPointType('toss')}
                        className="checkout__tossRadio"
                      />
                      <img src={tossPng} alt="" className="checkout__tossOptionIcon" aria-hidden />
                      <span className="checkout__tossOptionText">
                        <span className="checkout__tossOptionLabel">토스 포인트</span>
                        <span className="checkout__tossOptionAmount">{tossPoint.toLocaleString('ko-KR')} P</span>
                      </span>
                      <span className="checkout__tossRadioMark" aria-hidden />
                    </label>
                  </div>
                </div>
              )}
            </section>

            <div className="checkout__line" />

            <section className="checkout__section checkout__section--payment">
              <button
                type="button"
                className="checkout__paymentHeader"
                onClick={() => setPaymentOpen(!paymentOpen)}
                aria-expanded={paymentOpen}
              >
                <span className="checkout__paymentTitle">결제수단</span>
                <span className="checkout__paymentHeaderRight">{paymentMethodLabel[paymentMethod]}</span>
                <img
                  className={`checkout__chevronIcon ${paymentOpen ? 'checkout__chevronIcon--up' : ''}`}
                  src={chevronDownSvg}
                  alt=""
                  aria-hidden
                />
              </button>
              {paymentOpen && (
                <div className="checkout__paymentBody">
                  <div className="checkout__paymentGrid">
                    <button
                      type="button"
                      className={`checkout__paymentCard ${paymentMethod === 'card' ? 'checkout__paymentCard--active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <img src={creditCardSvg} alt="" className="checkout__paymentCardIcon" aria-hidden />
                      <span className="checkout__paymentCardLabel">카드결제</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout__paymentCard ${paymentMethod === 'simple' ? 'checkout__paymentCard--active' : ''}`}
                      onClick={() => setPaymentMethod('simple')}
                    >
                      <img src={qrCodeScannerSvg} alt="" className="checkout__paymentCardIcon" aria-hidden />
                      <span className="checkout__paymentCardLabel">간편결제</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout__paymentCard ${paymentMethod === 'cash' ? 'checkout__paymentCard--active' : ''}`}
                      onClick={() => setPaymentMethod('cash')}
                    >
                      <img src={moneyBagSvg} alt="" className="checkout__paymentCardIcon" aria-hidden />
                      <span className="checkout__paymentCardLabel">현금결제</span>
                    </button>
                    <button
                      type="button"
                      className={`checkout__paymentCard ${paymentMethod === 'transfer' ? 'checkout__paymentCard--active' : ''}`}
                      onClick={() => setPaymentMethod('transfer')}
                    >
                      <img src={walletSvg} alt="" className="checkout__paymentCardIcon" aria-hidden />
                      <span className="checkout__paymentCardLabel">계좌이체</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="checkout__footer">
            {tossWasOpened && (
              <>
                <div className="checkout__footerRow">
                  <span className="checkout__footerLabel">포인트 적립 <em className="checkout__footerHighlight">{pointAccumulationRate}%</em></span>
                  <span className="checkout__footerHighlight">{pointAccumulation.toLocaleString('ko-KR')}P</span>
                </div>
                <div className="checkout__footerRow">
                  <span className="checkout__footerLabel">할인된 금액</span>
                  <span className="checkout__footerValue checkout__footerValue--discount">{discountAmount.toLocaleString('ko-KR')}원</span>
                </div>
              </>
            )}
            {payError && <p className="checkout__payError" role="alert">{payError}</p>}
            <button
              type="button"
              className="checkout__payBtn"
              disabled={finalAmount < 0 || cartItems.length === 0 || paySubmitting}
              onClick={handlePay}
            >
              {paySubmitting ? '처리 중...' : `${finalAmount.toLocaleString('ko-KR')}원 결제하기`}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
