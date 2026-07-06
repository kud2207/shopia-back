import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { convertCurrency, getFaqs, getGeoInfo, getPlans, saveNewsletter } from 'src/@apiCore/npoints'
import LandingLayout from 'src/@core/layouts/LandingLayout'
import { PricingTable, PricingSlot, PricingDetail } from 'react-pricing-table'
import { useRouter } from 'next/router'
import { formatNumber } from 'src/@core/utils/format-currency'
import { CircularProgress, Dialog, DialogContent } from '@mui/material'
import { toast, ToastContainer } from 'react-toastify'
import dynamic from 'next/dynamic'
import swal from 'sweetalert'

const OwlCarousel: any = dynamic(() => import('react-owl-carousel'), { ssr: false })

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}
const HomePage = () => {
  const { t, i18n } = useTranslation('common')
  const [plans, setPlans] = useState<any[]>([])
  const [load, setLoad] = useState(false)
  const [show, setShow] = useState(false)

  const [location, setLocation] = useState<any>(null)
  const [taux, setTaux] = useState<any>(1)
  const [faqs, setFaqs] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const router = useRouter()

  useEffect(() => {
    if (!location)
      getGeoInfo().then(response => {
        setLocation(response.data)
        console.log(response.data)
      })
    getPlans().then(response => {
      if (response.status == 200) setPlans(response.data.data)
    })
    getFaqs('marchand').then(response => {
      if (response.status == 200) {
        setFaqs(response.data.data)
        setSelectedItem(response.data.data[0])
      }
    })
  }, [])

  useEffect(() => {
    if (location && location.currency != 'USD') {
      convertCurrency('USD', location.currency == 'FCFA' ? 'XAF' : location.currency).then(val => {
        if (typeof val == 'number') setTaux(val)
      })
    }
  }, [location])

  const handleSubmit = (event: any) => {
    event.preventDefault()
    const data = new FormData(event.target)
    if (data.get('email')) {
      setLoad(true)

      saveNewsletter({ email: data.get('email') })
        .then((response: any) => {
          if (response.status == 201) {
            toast.success(t('subscription_success'))
          } else toast.error(t('subscription_fail'))
        })
        .catch(() => toast.error(t('subscribe_fail')))
        .finally(() => setLoad(false))
    }
  }

  const handleWait = e => {
    e.preventDefault()
    swal({
      title: '',
      text: t('dispo') + '',
      icon: 'info'
    })
  }
  return (
    <>
      <section className='banner_section'>
        <div className='container'>
          <div className='anim_line'>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
            <span>
              <img src='/assets/images/anim_line.png' alt='anim_line' />
            </span>
          </div>

          <div className='row'>
            <div className='col-lg-6 col-md-12' data-aos='fade-right' data-aos-duration='1500'>
              <div className='banner_text'>
                <h1>
                  {t('boost')} <span> {t('with_ai')}</span>
                </h1>

                <p>{t('welcome_text')}</p>
              </div>

              <ul className='app_btn'>
                <li>
                  <a href='/register'>{t('try_now')}</a>
                </li>
              </ul>
            </div>

            <div className='col-lg-3 col-md-6' data-aos='fade-in' data-aos-duration='1500'>
              <div className='banner_images image_box1'>
                <span className='banner_image1'>
                  {' '}
                  <img
                    className='moving_position_animatin'
                    height={400}
                    style={{ height: 'auto' }}
                    src='/images/banner.png'
                    alt='image'
                  />{' '}
                </span>
                <span className='banner_image2'>
                  {' '}
                  <img className='moving_animation' height={100} src='/images/banner4.png' alt='image' />{' '}
                </span>
              </div>
            </div>

            <div className='col-lg-3 col-md-6' data-aos='fade-in' data-aos-duration='1500'>
              <div className='banner_images image_box2'>
                <span className='banner_image3'>
                  {' '}
                  <img className='moving_animation' height={300} src='/images/banner2.png' alt='image' />{' '}
                </span>
                <span className='banner_image4'>
                  {' '}
                  <img className='moving_position_animatin' height={200} src='/images/banner5.png' alt='image' />{' '}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='row_am trusted_section'>
        <div className='container'>
          <div className='section_title' data-aos='fade-up' data-aos-duration='1500' data-aos-delay='100'>
            <h2>
              {t('trusted_by')} <span>100+</span> {t('companies')}
            </h2>

            <p>{t('trusted_text')}</p>
          </div>

          <div className='company_logos'>
            <OwlCarousel
              className='owl-carousel owl-theme'
              loop
              margin={10}
              autoplay
              smartSpeed={1500}
              dots
              responsive={{
                0: {
                  items: 2
                },
                600: {
                  items: 3
                },
                1000: {
                  items: 5
                }
              }}
            >
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/paypal.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/vente1.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/spoty.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/shopboat.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/slack.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/envato.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/paypal.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/spoty.png' alt='image' />
                </div>
              </div>
              <div className='item'>
                <div className='logo'>
                  <img src='/assets/images/shopboat.png' alt='image' />
                </div>
              </div>
            </OwlCarousel>
          </div>
        </div>
      </section>

      <section className='row_am features_section' id='features'>
        <div className='container'>
          <div className='section_title' data-aos='fade-up' data-aos-duration='1500' data-aos-delay='100'>
            <h2>
              <span>{t('features')}</span> {t('unique')}
            </h2>

            <p>{t('features_text')}</p>
          </div>
          <div className='feature_detail'>
            <div className='left_data feature_box'>
              <div className='data_block' data-aos='fade-right' data-aos-duration='1500'>
                <div className='icon'>
                  <img src='/assets/images/live-chat.png' alt='image' />
                </div>
                <div className='text'>
                  <h4>{t('chat_bot')}</h4>
                  <p>{t('chat_bot_text')}</p>
                </div>
              </div>

              <div className='data_block' data-aos='fade-right' data-aos-duration='1500'>
                <div className='icon'>
                  <img src='/assets/images/premium.png' alt='image' />
                </div>
                <div className='text'>
                  <h4>{t('delivery')}</h4>
                  <p>{t('delivery_text')}</p>
                </div>
              </div>
            </div>

            <div className='right_data feature_box'>
              <div className='data_block' data-aos='fade-left' data-aos-duration='1500'>
                <div className='icon'>
                  <img src='/assets/images/unlimited.png' alt='image' />
                </div>
                <div className='text'>
                  <h4>{t('dashboard')}</h4>
                  <p>{t('dashboard_text')}</p>
                </div>
              </div>

              <div className='data_block' data-aos='fade-left' data-aos-duration='1500'>
                <div className='icon'>
                  <img src='/assets/images/support.png' alt='image' />
                </div>
                <div className='text'>
                  <h4>{t('support')}</h4>
                  <p>{t('support_text')}</p>
                </div>
              </div>
            </div>

            <div className='feature_img banner_section' data-aos='fade-in' data-aos-duration='1500'>
              <div className='banner_slider'>
                <div className='left_icon'></div>
                <div className='right_icon'></div>
                <OwlCarousel
                  id='frmae_slider'
                  className='owl-carousel owl-theme'
                  loop
                  margin={10}
                  smartSpeed={1500}
                  dots
                  responsive={{
                    0: {
                      items: 1
                    },
                    600: {
                      items: 1
                    },
                    1000: {
                      items: 1
                    }
                  }}
                >
                  <div className='item'>
                    <div className='slider_img'>
                      <img
                        src='/assets/images/banner.png'
                        style={{ marginTop: '5px', borderRadius: '40px', height: 630 }}
                        alt='image'
                      />
                    </div>
                  </div>
                  <div className='item'>
                    <div className='slider_img'>
                      <img
                        src='/assets/images/screen1.png'
                        style={{ marginTop: '9px', borderRadius: '40px', height: 630 }}
                        alt='image'
                      />
                    </div>
                  </div>
                  <div className='item'>
                    <div className='slider_img'>
                      <img
                        src='/assets/images/screen2.png'
                        style={{ marginTop: '9px', borderRadius: '40px', height: 630 }}
                        alt='image'
                      />
                    </div>
                  </div>
                </OwlCarousel>
                <div className='slider_frame'>
                  <img src='/assets/images/mobile_frame_svg.svg' alt='image' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='row_am about_app_section'>
        <div className='container'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='about_img' data-aos='fade-in' data-aos-duration='1500'>
                <div className='frame_img'>
                  <img className='moving_position_animatin' src='/assets/images/about.png' alt='image' />
                </div>
                <div className='screen_img'>
                  <img className='moving_animation' src='/assets/images/download-screen01.png' alt='image' />
                </div>
              </div>
            </div>
            <div className='col-lg-6'>
              <div className='about_text'>
                <div className='section_title' data-aos='fade-up' data-aos-duration='1500' data-aos-delay='100'>
                  <h2>{t('stats')}</h2>
                  <p>{t('stats_text')}</p>
                </div>

                <ul className='app_statstic' id='counter' data-aos='fade-in' data-aos-duration='1500'>
                  <li>
                    <div className='icon'>
                      <img src='/assets/images/followers.png' alt='image' />
                    </div>
                    <div className='text'>
                      <p>
                        <span className='counter-value' data-count='1000'>
                          1000
                        </span>
                        <span>+</span>
                      </p>
                      <p>{t('marchands')}</p>
                    </div>
                  </li>
                  <li>
                    <div className='icon'>
                      <img src='/assets/images/reviews.png' alt='image' />
                    </div>
                    <div className='text'>
                      <p>
                        <span className='counter-value' data-count='100'>
                          100{' '}
                        </span>
                        <span>K+</span>
                      </p>
                      <p>{t('sales')}</p>
                    </div>
                  </li>

                  <li>
                    <div className='icon'>
                      <img src='/assets/images/countries.png' alt='image' />
                    </div>
                    <div className='text'>
                      <p>
                        <span className='counter-value' data-count='10'>
                          10
                        </span>
                        <span>+</span>
                      </p>
                      <p>{t('countries')}</p>
                    </div>
                  </li>
                </ul>

                <a href='/register' className='btn puprple_btn' data-aos='fade-in' data-aos-duration='1500'>
                  {t('try_now')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='row_am how_it_works' id='how_it_work'>
        <div className='container'>
          <div className='how_it_inner'>
            <div className='section_title' data-aos='fade-up' data-aos-duration='1500' data-aos-delay='300'>
              <h2>
                <span>{t('how_work1')}</span> - {t('easy_step')}
              </h2>

              <p>{t('how_work_text')}</p>
            </div>
            <div className='step_block'>
              <ul>
                <li>
                  <div className='step_text' data-aos='fade-right' data-aos-duration='1500'>
                    <h4>{t('step1')}</h4>
                    <div className='app_icon'>
                      <a href='https://play.google.com/store/apps/details?id=com.shopiaapp.app'>
                        <i className='icofont-brand-android-robot'></i>
                      </a>
                      <a href='#' onClick={handleWait}>
                        <i className='icofont-brand-apple'></i>
                      </a>
                    </div>
                    <p>
                      <span>
                        <a href='/register'>{t('step1_text')}</a>
                      </span>{' '}
                      {t('step1_text_1')}
                    </p>
                  </div>
                  <div className='step_number'>
                    <h3>01</h3>
                  </div>
                  <div className='step_img' data-aos='fade-left' data-aos-duration='1500'>
                    <img src='/assets/images/download_app.jpg' alt='image' />
                  </div>
                </li>

                <li>
                  <div className='step_text' data-aos='fade-left' data-aos-duration='1500'>
                    <h4>{t('step2')}</h4>
                    <span>{t('free_trial')}</span>
                    <p>{t('step2_text')}</p>
                  </div>
                  <div className='step_number'>
                    <h3>02</h3>
                  </div>
                  <div className='step_img' data-aos='fade-right' data-aos-duration='1500'>
                    <img src='/assets/images/create_account.jpg' alt='image' />
                  </div>
                </li>

                <li>
                  <div className='step_text' data-aos='fade-right' data-aos-duration='1500'>
                    <h4>{t('step3')}</h4>

                    <p>{t('step3_text')}</p>
                    <span>
                      {t('question')} <a href='#faqs'>FAQs</a>
                    </span>
                  </div>
                  <div className='step_number'>
                    <h3>03</h3>
                  </div>
                  <div className='step_img' data-aos='fade-left' data-aos-duration='1500'>
                    <img src='/assets/images/enjoy_app.jpg' alt='image' />
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className='yt_video' data-aos='fade-in' data-aos-duration='1500'>
            <div className='anim_line dark_bg'>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
            </div>
            <div className='thumbnil'>
              <img src='/images/banner-dark.png' alt='image' />
              <a
                className='popup-youtube play-button'
                data-toggle=''
                data-target='#myModal'
                href='#'
                onClick={e => {
                  e.preventDefault()
                  setShow(true)
                }}
              >
                <span className='play_btn'>
                  <img src='/assets/images/play_icon.png' alt='image' />
                  <div className='waves-block'>
                    <div className='waves wave-1'></div>
                    <div className='waves wave-2'></div>
                    <div className='waves wave-3'></div>
                  </div>
                </span>
                <span>{t('see_demo')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className='row_am pricing_section' id='pricing'>
        <div className='container'>
          <div className='section_title' data-aos='fade-up' data-aos-duration='1500' data-aos-delay='300'>
            <h2>
              {t('best_pricing')} <span>{t('simple')}</span>
            </h2>

            <p>{t('pricing_text')}</p>
          </div>

          {/* <div className='toggle_block' data-aos='fade-up' data-aos-duration='1500'>
            <span className='month active'>Monthly</span>
            <div className='tog_block'>
              <span className='tog_btn'></span>
            </div>
            <span className='years'>Yearly</span>
            <span className='offer'>50% off</span>
          </div> */}

          <div className='pricing_pannel monthly_plan active' data-aos='fade-up' data-aos-duration='1500'>
            <PricingTable highlightColor='#048DD6' buttonClass='btn-rounded'>
              {plans.map((item: any) => (
                <PricingSlot
                  key={item._id}
                  onClick={() => router.push('/register')}
                  buttonText={t('subscribe')}
                  title={t(item.title)}
                  priceText={`${formatNumber((item.price * taux).toFixed(1))} ${
                    taux != 1 ? location?.currency : 'USD'
                  }${
                    item.title != 'FREE' ? ' / ' + ((item.duration > 1 ? item.duration + ' ' : '') + t(item.unit)) : ''
                  }`}
                  highlighted={item.color != ''}
                  className='pricing_block'
                >
                  {item?.content[i18n?.language]?.avantages?.map((val: any, index: number) => (
                    <PricingDetail key={index}>{val}</PricingDetail>
                  ))}
                  <PricingDetail key={'credit' + item._id}>
                    {formatNumber((item.credit * taux).toFixed(0))} {taux != 1 ? location?.currency : 'USD'}{' '}
                    {t('ia_credit')}
                    {item.title != 'FREE'
                      ? ' / ' + ((item.duration > 1 ? item.duration + ' ' : '') + t(item.unit))
                      : ''}
                  </PricingDetail>
                </PricingSlot>
              ))}
            </PricingTable>
          </div>

          <p className='contact_text' data-aos='fade-up' data-aos-duration='1500'>
            {t('not_sure')} <a href='mailto:suppot@shopia-app.com'>{t('contact_us')}</a> {t('more_info')}
          </p>
        </div>
      </section>

      <section className='row_am faq_section' id='faqs'>
        <div className='container'>
          <div className='section_title' data-aos='fade-up' data-aos-duration='500' data-aos-delay='300'>
            <h2>
              <span>FAQ</span> -{t('faqs')}
            </h2>

            <p>{t('faqs_text')}</p>
          </div>

          <div className='faq_panel'>
            <div className='accordion' id='accordionExample'>
              {faqs.map((item, index) => (
                <div className='card' data-aos='fade-up' data-aos-duration='500'>
                  <div className='card-header' id={'heading' + index}>
                    <h2 className='mb-0'>
                      <button
                        type='button'
                        className={'btn btn-link ' + (selectedItem?._id == item._id ? 'active' : '')}
                        data-toggle='collapse'
                        data-target={'#collapse' + index}
                        onClick={() => setSelectedItem(item)}
                      >
                        <i
                          className={selectedItem?._id == item._id ? 'icon_faq icofont-minus' : 'icon_faq icofont-plus'}
                        ></i>{' '}
                        {item.title[i18n.language]}
                      </button>
                    </h2>
                  </div>
                  <div
                    id={'collapse' + index}
                    className={'collapse ' + (selectedItem?._id == item._id ? 'show' : '')}
                    aria-labelledby={'heading' + index}
                    data-parent='#accordionExample'
                  >
                    <div className='card-body'>
                      <p>{item.content[i18n.language]}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className='row_am free_app_section' id='getstarted'>
        <div className='container'>
          <div className='free_app_inner' data-aos='fade-in' data-aos-duration='1500' data-aos-delay='100'>
            <div className='anim_line dark_bg'>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
              <span>
                <img src='/assets/images/anim_line.png' alt='anim_line' />
              </span>
            </div>

            <div className='row'>
              <div className='col-md-6'>
                <div className='free_text'>
                  <div className='section_title'>
                    <h2>{t('download')}</h2>
                    <p>{t('download_text')}</p>
                  </div>
                  <ul className='app_btn'>
                    <li>
                      <a href='https://play.google.com/store/apps/details?id=com.shopiaapp.app'>
                        <img src='/assets/images/googleplay_blue.png' alt='image' />
                      </a>
                    </li>
                    <li>
                      <a href='#' onClick={handleWait}>
                        <img src='/assets/images/store.jpg' alt='image' />
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className='col-md-6'>
                <div className='free_img'>
                  <img src='/assets/images/download-screen01.png' alt='image' />
                  <img className='mobile_mockup' src='/assets/images/download-screen02.png' alt='image' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='newsletter_section'>
        <div className='container'>
          <div className='newsletter_box'>
            <div className='section_title' data-aos='fade-in' data-aos-duration='1500' data-aos-delay='100'>
              <h2>{t('newsletter')}</h2>

              <p>{t('newsletter_text')}</p>
            </div>
            <form
              onSubmit={handleSubmit}
              method='post'
              data-aos='fade-in'
              data-aos-duration='1500'
              data-aos-delay='100'
            >
              <div className='form-group'>
                <input
                  type='email'
                  name='email'
                  required
                  className='form-control'
                  placeholder={t('enter_email') || ''}
                />
              </div>
              <div className='form-group'>
                <button className='btn' type='submit'>
                  {t('submit')} {load && <CircularProgress size={20} sx={{ ml: 5 }} color='inherit' />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
      <Dialog maxWidth='md' sx={{ zIndex: 999999 }} fullWidth open={show} onClose={() => setShow(false)}>
        <DialogContent>
          <div id='video-container' className='video-container'>
            <iframe
              src='https://www.youtube.com/embed/5mH6S6T4RR0?autoplay=1'
              width='100%'
              height='400'
              frameBorder='0'
              allowFullScreen
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
      <ToastContainer position='bottom-center' />
    </>
  )
}
HomePage.getLayout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>
HomePage.defaultProps = { isHome: true }
export default HomePage
