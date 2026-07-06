import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getFaqs, saveNewsletter } from 'src/@apiCore/npoints'
import LandingLayout from 'src/@core/layouts/LandingLayout'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { CircularProgress } from '@mui/material'
import { toast, ToastContainer } from 'react-toastify'

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

  const [faqs, setFaqs] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    getFaqs('partner').then(response => {
      if (response.status == 200) setFaqs(response.data.data)
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
  return (
    <>
      <div className="bred_crumb">
      <div className="container">
        <span className="banner_shape1"> <img src="/assets/images/banner-shape1.png" alt="image" /> </span>
        <span className="banner_shape2"> <img src="/assets/images/banner-shape2.png" alt="image" /> </span>
        <span className="banner_shape3"> <img src="/assets/images/banner-shape3.png" alt="image" /> </span>
        
        <div className="bred_text">
          <h1>Contact us</h1>
          <p>If you have an query, please get in touch with us, we will revert back quickly.</p>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><span>»</span></li>
            <li><a href="contact.html">Contact us</a></li>
          </ul>
        </div>
      </div>
    </div>  
      <section className='contact_page_section'>
        <div className='container'>
          <div className='contact_inner'>
            <div className='contact_form'>
              <div className='section_title'>
                <h2>
                  Leave a <span>message</span>
                </h2>
                <p>Fill up form below, our team will get back soon</p>
              </div>
              <form action='#'>
                <div className='form-group'>
                  <input type='text' placeholder='Name' className='form-control' />
                </div>
                <div className='form-group'>
                  <input type='email' placeholder='Email' className='form-control' />
                </div>
                <div className='form-group'>
                  <input type='text' placeholder='Company Name' className='form-control' />
                </div>
                <div className='form-group'>
                  <select className='form-control'>
                    <option value=''>Country</option>
                  </select>
                </div>
                <div className='form-group'>
                  <input type='text' placeholder='Phone' className='form-control' />
                </div>
                <div className='form-group'>
                  <input type='text' placeholder='Website' className='form-control' />
                </div>
                <div className='form-group'>
                  <textarea className='form-control' placeholder='Your message'></textarea>
                </div>
                <div className='form-group term_check'>
                  <input type='checkbox' id='term' />
                  <label htmlFor='term'>I agree to receive emails, newsletters and promotional messages</label>
                </div>
                <div className='form-group mb-0'>
                  <button type='submit' className='btn puprple_btn'>
                    SEND MESSAGE
                  </button>
                </div>
              </form>
            </div>
            <div className='contact_info'>
              <div className='icon'>
                <img src='/assets/images/contact_message_icon.png' alt='image' />
              </div>
              <div className='section_title'>
                <h2>
                  Have any <span>question?</span>
                </h2>
                <p>
                  If you have any question about our product, service, payment or company, Visit our{' '}
                  <a href='faq.html'>FAQs page.</a>
                </p>
              </div>
              <a href='faq.html' className='btn puprple_btn'>
                READ FAQ
              </a>
              <ul className='contact_info_list'>
                <li>
                  <div className='img'>
                    <img src='/assets/images/mail_icon.png' alt='image' />
                  </div>
                  <div className='text'>
                    <span>Email Us</span>
                    <a href='mailto:example@gmail.com'>example@gmail.com</a>
                  </div>
                </li>
                <li>
                  <div className='img'>
                    <img src='/assets/images/call_icon.png' alt='image' />
                  </div>
                  <div className='text'>
                    <span>Call Us</span>
                    <a href='tel:+1(888)553-46-11'>+1 (888) 553-46-11</a>
                  </div>
                </li>
                <li>
                  <div className='img'>
                    <img src='/assets/images/location_icon.png' alt='image' />
                  </div>
                  <div className='text'>
                    <span>Visit Us</span>
                    <p>5687, Business Avenue, New York, USA 5687</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <ToastContainer position='bottom-center' />
    </>
  )
}
HomePage.getLayout = (page: ReactNode) => <LandingLayout>{page}</LandingLayout>
HomePage.defaultProps = { isHome: true }

export default HomePage
