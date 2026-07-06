// ** MUI Imports
import Head from 'next/head'
import { Box, Typography } from '@mui/material'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import moment from 'moment'
import { useRouter } from 'next/router'
import AOS from 'aos';
import $ from 'jquery'
import { useEffect } from 'react'
import swal from 'sweetalert'
import { Script } from 'mdi-material-ui'

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['common']))
    }
  }
}
const LandingLayout = ({ children, ...props }: any) => {
  const { t, i18n } = useTranslation('common')
  const router = useRouter()

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language)
    const { pathname, asPath, query } = router
    router.push({ pathname, query }, asPath, { locale: language })
  }

  useEffect(() => {
    $(document).ready(function () {
      var toTop = $('.go_top')
      toTop.on('click', function () {
        $('html, body').animate({ scrollTop: $('html, body').offset().top }, 400)
      })

      $(window).scroll(() => {
        // declare variable
        var topPos = $(document).scrollTop()

        // if user scrolls down - show scroll to top button
        if (topPos > 750) {
          $(toTop).css('opacity', '1')
        } else {
          $(toTop).css('opacity', '0')
        }
      })

      // Fix Header Js
      $(window).scroll(function () {
        if ($(window).scrollTop() >= 250) {
          $('header').addClass('fix_style')
        } else {
          $('header').removeClass('fix_style')
        }
        if ($(window).scrollTop() >= 260) {
          $('header').addClass('fixed')
        } else {
          $('header').removeClass('fixed')
        }
      })

     

      $('.navbar-toggler').click(() => {
        if ($('.navbar-toggler').children('span').children('.ico_menu').hasClass('icofont-navigation-menu')) {
          $('.navbar-toggler')
            .children('span')
            .children('.ico_menu')
            .removeClass('icofont-navigation-menu')
            .addClass('icofont-close')
        } else {
          $('.navbar-toggler')
            .children('span')
            .children('.ico_menu')
            .removeClass('icofont-close')
            .addClass('icofont-navigation-menu')
        }
      })
      ;(function () {
        $('.toggle-wrap').on('click', function () {
          $('.toggle-wrap').toggleClass('active')
          $('#navbarSupportedContent').animate({ width: 'toggle' }, 200)
        })
      })()
    })

    $(document).ready(function () {
    
      // Download Section Hover Jquery
      window.addEventListener('scroll', function () {
        var element = document.querySelector('.free_text')
        var position = element?.getBoundingClientRect()
    
        if (position && position.top < window.innerHeight && position.bottom >= 0) {
          $('.purple_backdrop').css('opacity', '1')
        } else {
          //console.log('Element is not visible');
          $('.purple_backdrop').css('opacity', '0')
        }
      })
    
      $(window).on('resize', function () {
        if ($(window).width() < 768) {
          window.addEventListener('scroll', function () {
            var element = document.querySelector('.mobile_mockup')
            var position = element?.getBoundingClientRect()
    
            if (position && position.top < window.innerHeight && position.bottom >= 0) {
              $('.purple_backdrop').css('opacity', '1')
            } else {
              //console.log('Element is not visible');
              $('.purple_backdrop').css('opacity', '0')
            }
          })
        } else {
          window.addEventListener('scroll', function () {
            var element = document.querySelector('.free_text')
            var position = element?.getBoundingClientRect()
    
            if (position && position.top < window.innerHeight && position.bottom >= 0) {
              $('.purple_backdrop').css('opacity', '1')
            } else {
              //console.log('Element is not visible');
              $('.purple_backdrop').css('opacity', '0')
            }
          })
        }
      })
    })
  }, [])
  
  useEffect(() => {
    AOS.init();
  }, [])

  useEffect(()=>{
    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
  s1.async=true;
  s1.src='https://embed.tawk.to/66719767981b6c56477e7fd9/1i0lrerk6';
  s1.charset='UTF-8';
  s1.setAttribute('crossorigin','*');
  s0.parentNode?.insertBefore(s1,s0);
  })();
  },[])

  
  const handleWait = e => {
    e.preventDefault()
    swal({
      title: '',
      text: t('dispo') + '',
      icon: 'info'
    })
  }

  return (
    <html lang='en'>
      <Head>
        <meta charSet='UTF-8' />
        <meta http-equiv='X-UA-Compatible' content='IE=edge' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <title>
          SHOPIA:: {t('boost')} {t('with_ai')}
        </title>
        <meta name='description' content={t('welcome_text') || ''} />
        <meta
          name='keywords'
          content='IA, AI, WhatsApp, Vente en ligne, Boostez vos ventes, vendre sur WhatsApp, sale, sale online, intelligence artificiele, Ecommerce & IA, Shop online, Boutique en lingne'
        />

        <link rel='stylesheet' href='/assets/css/icofont.min.css' />
        <link rel='stylesheet' href='/assets/css/owl.carousel.min.css' />
        <link rel='stylesheet' href='/assets/css/bootstrap.min.css' />
        <link rel='stylesheet' href='/assets/css/aos.css' />
        <link rel='stylesheet' href='/assets/css/style.css' />
        <link rel='stylesheet' href='/assets/css/responsive.css' />
        <link rel='shortcut icon' href='images/favicon.png' type='image/x-icon' />
      </Head>
      <body>
        <div className='page_wrapper'>
          {/* <div id='preloader'>
            <div id='loader'></div>
          </div> */}

          <header>
            <div className='container'>
              <nav className='navbar navbar-expand-lg'>
                <a href='#'>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={`/images/logos/logo-light.png`} alt='S' width={60} height={60} />

                    <Typography
                      variant='h6'
                      sx={{
                        ml: 1,
                        lineHeight: 1,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        fontSize: '1.5rem !important',
                        color: '#002f58'
                      }}
                    >
                      ShopIA
                    </Typography>
                  </Box>{' '}
                </a>
                <button
                  className='navbar-toggler'
                  type='button'
                  data-toggle='collapse'
                  data-target='#navbarSupportedContent'
                  aria-controls='navbarSupportedContent'
                  aria-expanded='false'
                  aria-label='Toggle navigation'
                >
                  <span className='navbar-toggler-icon'>
                    <div className='toggle-wrap'>
                      <span className='toggle-bar'></span>
                    </div>
                  </span>
                </button>

                <div className='collapse navbar-collapse' id='navbarSupportedContent'>
                  <ul className='navbar-nav ml-auto'>
                    <li className='nav-item'>
                      <a className='nav-link' href='/#'>
                        {t('home')}
                      </a>
                    </li>

                    <li className='nav-item'>
                      <a className='nav-link' href='/#features'>
                        {t('features')}
                      </a>
                    </li>
                    <li className='nav-item'>
                      <a className='nav-link' href='/#how_it_work'>
                        {t('how_work1')}
                      </a>
                    </li>

                    <li className='nav-item'>
                      <a className='nav-link' href='/#pricing'>
                        {t('price')}
                      </a>
                    </li>

                    <li className='nav-item'>
                      <a className='nav-link dark_btn' href={props?.route || '/login'}>
                        {t('start')}
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </header>
          {children}

          <footer>
            <div className='top_footer' id='contact'>
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
              <div className='container'>
                <div className='row'>
                  <div className='col-lg-4 col-md-6 col-12'>
                    <div className='abt_side'>
                      <div>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <img src={`/images/logos/logo-dark.png`} alt='S' width={60} height={60} />

                          <Typography
                            variant='h6'
                            sx={{
                              ml: 1,
                              lineHeight: 1,
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              fontSize: '1.5rem !important',
                              color: '#fff'
                            }}
                          >
                            ShopIA
                          </Typography>
                        </Box>
                      </div>
                      <Box mt={3}>
                        <ul>
                          <li>
                            <a href='mailto:support@shopia-app.com'>support@shopia-app.com</a>
                          </li>
                        </ul>
                      </Box>
                      <ul className='social_media'>
                        <li>
                          <a href='#'>
                            <i className='icofont-facebook'></i>
                          </a>
                        </li>
                        <li>
                          <a href='#'>
                            <i className='icofont-twitter'></i>
                          </a>
                        </li>
                        <li>
                          <a href='#'>
                            <i className='icofont-instagram'></i>
                          </a>
                        </li>
                        <li>
                          <a href='#'>
                            <i className='icofont-pinterest'></i>
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className='col-lg-3 col-md-6 col-12'>
                    <div className='links'>
                      <h3>{t('utile_link')}</h3>
                      <ul>
                        <li>
                          <Link href='/#'>{t('home')}</Link>
                        </li>
                        <li>
                          <a href='/become-deliver'>{t('become_deliver')}</a>
                        </li>
                        <li>
                          <a href='/become-partner'>{t('become_partner')}</a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className='col-lg-3 col-md-6 col-12'>
                    <div className='links'>
                      <h3>{t('help')}</h3>
                      <ul>
                        <li>
                          <a href='#faqs'>FAQs</a>
                        </li>
                        <li>
                          <a href='/#how_it_work'>{t('how_work')}</a>
                        </li>
                        <li>
                          <Link href='/terms'>{t('terms')}</Link>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className='col-lg-2 col-md-6 col-12'>
                    <div className='try_out'>
                      <h3>{t('ourapp')}</h3>
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
                      <Box mt={2}>
                        <ul>
                          <li>
                            <select className='form-control' onChange={e => handleLanguageChange(e.target.value)}>
                              <option value={'fr'} selected={i18n?.language == 'fr'}>
                                Français
                              </option>
                              <option value={'en'} selected={i18n?.language == 'en'}>
                                English
                              </option>
                            </select>
                          </li>
                        </ul>
                      </Box>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='bottom_footer'>
              <div className='container'>
                <div className='row'>
                  <div className='col-md-6'>
                    <p>© Copyrights {moment().format('YYYY')}. All rights reserved.</p>
                  </div>
                  <div className='col-md-6'>
                    <p className='developer_text'>
                      Made width ❤️ by{' '}
                      <a href='#' target='blank'>
                        Smart Tech Group
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='go_top'>
              <span>
                <img src='/assets/images/go_top.png' alt='image' />
              </span>
            </div>
          </footer>
          <div className='purple_backdrop'></div>
        </div>
      </body>
    </html>
  )
}

export default LandingLayout
