import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getFaqs, saveNewsletter } from 'src/@apiCore/npoints'
import LandingLayout from 'src/@core/layouts/LandingLayout'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { CircularProgress } from '@mui/material'
import { toast, ToastContainer } from 'react-toastify'
import swal from 'sweetalert'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}
const HomePage = () => {
  const { t, i18n } = useTranslation('common')
  const [load, setLoad] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const [faqs, setFaqs] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    getFaqs('partenaire').then(response => {
      if (response.status == 200) {
        setFaqs(response.data.data)
        setSelectedItem(response.data.data[0])
      }
    })
  }, [])

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
                <h1>{t('partner_title')}</h1>

                <p>{t('partner_text')}</p>
              </div>

              <ul className='app_btn'>
                <li>
                  <Link href='/register?u=partenaire'>{t('begin_now')}</Link>
                </li>
              </ul>
            </div>

            <div className='col-lg-6 col-md-6' data-aos='fade-in' data-aos-duration='500'>
              <img className='moving_position_animatin' width={"100%"} style={{borderRadius: "150px 10px"}} src='/assets/images/money.jpg' alt='image' />{' '}
            </div>
          </div>
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
      <div className='modal fade youtube-video' id='myModal' tabIndex={-1} role='dialog' aria-labelledby='myModalLabel'>
        <div className='modal-dialog' role='document'>
          <div className='modal-content'>
            <button id='close-video' type='button' className='button btn btn-default text-right' data-dismiss='modal'>
              <i className='icofont-close-line-circled'></i>
            </button>
            <div className='modal-body'>
              <div id='video-container' className='video-container'>
                <iframe id='youtubevideo' src='#' width='640' height='360' frameBorder='0' allowFullScreen></iframe>
              </div>
            </div>
            <div className='modal-footer'></div>
          </div>
        </div>
      </div>
      <ToastContainer position='bottom-center' />
    </>
  )
}
HomePage.getLayout = (page: ReactNode) => <LandingLayout route="/register?u=partenaire">{page}</LandingLayout>
HomePage.defaultProps = { isHome: true }

export default HomePage
