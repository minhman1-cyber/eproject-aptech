import ImmediateCare from "../components/aboutus/ImmediateCare"
import IntroSection from "../components/aboutus/IntroSection"
import LeadingEdge from "../components/aboutus/LeadingEdge"
import PageTitle from "../components/aboutus/PageTitle"
import Partners from "../components/aboutus/Partners"
import Testimonials from "../components/aboutus/Testimonials"
import WhyChooseUs from "../components/aboutus/WhyChooseUs"

function AboutUs(){
    return(
        <>
            <PageTitle />
            <IntroSection/>
            <ImmediateCare/>
            <WhyChooseUs/>
            <Partners/>
            <LeadingEdge/>
            <Testimonials/>
        </>
    )
}
export default AboutUs